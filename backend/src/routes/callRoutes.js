const express = require('express');
const router = express.Router();
const { getTodayCallEvents, getAllCallEvents, createCallEvent } = require('../db/queries/callEvents');
const { getPatientById, getPatientByPhoneNumber } = require('../db/queries/patients');
const { getMedicationsByPatientId, createMedication } = require('../db/queries/medications');
const { makeOutboundCall } = require('../services/africasTalkingService');
const { preGenerateReminderAudio, generateDiagnosticAudio } = require('../services/reminderPipelineService');
const db = require('../db/connection');

/**
 * @openapi
 * /calls/today:
 *   get:
 *     tags: [Call Events]
 *     summary: Retrieve today's scheduled and executed medication reminder calls
 *     description: Returns chronological list of all voice reminder calls for the current day across all patients.
 *     responses:
 *       200:
 *         description: List of today's call events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calls:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/today', async (req, res, next) => {
  try {
    if (req.query.all === 'true') {
      const calls = await getAllCallEvents();
      return res.json({ calls });
    }
    const calls = await getTodayCallEvents();
    res.json({ calls });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /calls:
 *   get:
 *     tags: [Call Events]
 *     summary: Retrieve all recent medication reminder calls
 *     description: Returns chronological list of all voice reminder calls across the last 7 to 30 days.
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const calls = await getAllCallEvents(limit);
    res.json({ calls });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /calls/trigger:
 *   post:
 *     tags: [Call Events]
 *     summary: Trigger an instant outbound reminder call to a patient
 *     description: Directly dispatches a live voice call via Africa's Talking.
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { patient_id, phone_number, call_type = 'reminder' } = req.body;
    let patient = null;
    if (patient_id) {
      patient = await getPatientById(patient_id);
    } else if (phone_number) {
      patient = await getPatientByPhoneNumber(phone_number);
    }
    const targetPhone = phone_number || (patient ? patient.phone_number : null);
    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number or valid patient ID is required' });
    }

    const patientLang = (patient?.preferred_language || 'english').toUpperCase();
    console.log(`\n======================================================`);
    console.log(`🚀 [FRONTEND TRIGGER]: Live Outbound Call Requested [Mode: ${call_type.toUpperCase()}]`);
    console.log(`   Patient: ${patient ? patient.name : 'Custom Phone'} (${targetPhone})`);
    console.log(`   Language Mode: [${patientLang}]`);
    console.log(`======================================================`);

    let medicationId = null;
    if (patient) {
      const meds = await getMedicationsByPatientId(patient.id);
      if (meds.length > 0) {
        medicationId = meds[0].id;
      } else {
        console.log(`ℹ️ [MEDICATION REGIMEN]: Patient #${patient.id} had no meds enrolled. Auto-creating baseline regimen...`);
        const newMed = await createMedication({
          patient_id: patient.id,
          drug_name: 'Amoxicillin 500mg',
          instruction_source: 'template',
          audio_url: '/audio/default-reminder.mp3',
          schedule_times: '08:00, 20:00',
          duration_days: 7,
          is_chronic: 0
        });
        medicationId = newMed.id;
      }
    }

    let generatedCallAudio = null;

    // Pre-generate AI audio depending on call type — guaranteed Cloudinary URL BEFORE call dispatch
    if (patient && medicationId) {
      const { CLOUDINARY_STATIC_AUDIO } = require('../services/cloudinaryService');
      const isPatientEnglish = patientLang === 'ENGLISH';

      try {
        if (call_type === 'reminder') {
          const { getMedicationById } = require('../db/queries/medications');
          const med = await getMedicationById(medicationId);
          if (med && med.reminder_audio_url && med.reminder_audio_url.startsWith('http')) {
            generatedCallAudio = med.reminder_audio_url;
            console.log(`\n✓ [AUDIO PARITY]: Using existing Cloudinary reminder audio for Patient #${patient.id}: ${generatedCallAudio}`);
          } else {
            console.log(`\n🤖 [AI PIPELINE]: Pre-generating reminder audio for Patient #${patient.id}...`);
            const audioResult = await preGenerateReminderAudio({
              patientId: patient.id,
              medicationId: medicationId,
              speakerId: 'female'
            });
            if (typeof audioResult === 'string' && audioResult.startsWith('http')) {
              generatedCallAudio = audioResult;
              await db.query('UPDATE medications SET reminder_audio_url = $1 WHERE id = $2', [audioResult, medicationId]);
            }
          }
          if (!generatedCallAudio) {
            generatedCallAudio = isPatientEnglish ? CLOUDINARY_STATIC_AUDIO.default_reminder_en : CLOUDINARY_STATIC_AUDIO.default_reminder;
          }
        } else if (call_type === 'diagnostic') {
          console.log(`\n🩺 [DIAGNOSTIC PIPELINE]: Synthesizing AI diagnostic audio evaluation for Patient #${patient.id}...`);
          const diagAudio = await generateDiagnosticAudio({
            patientId: patient.id,
            medicationId: medicationId,
            speakerId: 'female'
          });
          if (typeof diagAudio === 'string' && diagAudio.startsWith('http')) {
            generatedCallAudio = diagAudio;
            console.log(`   ✓ Diagnostic audio generated and verified: ${generatedCallAudio}`);
          }
          if (!generatedCallAudio) {
            generatedCallAudio = isPatientEnglish ? CLOUDINARY_STATIC_AUDIO.english_diagnostic_reason : CLOUDINARY_STATIC_AUDIO.twi_diagnostic_reason;
          }
        }
      } catch (genErr) {
        console.warn('⚠️ [Call Trigger] AI Audio generation notice:', genErr.message);
        if (!generatedCallAudio) {
          generatedCallAudio = call_type === 'diagnostic'
            ? (isPatientEnglish ? CLOUDINARY_STATIC_AUDIO.english_diagnostic_reason : CLOUDINARY_STATIC_AUDIO.twi_diagnostic_reason)
            : (isPatientEnglish ? CLOUDINARY_STATIC_AUDIO.default_reminder_en : CLOUDINARY_STATIC_AUDIO.default_reminder);
        }
      }
    }

    if (!medicationId) {
      return res.status(400).json({
        error: 'Cannot trigger call: no medication found for this patient. Please prescribe a medication first.',
        code: 'NO_MEDICATION',
      });
    }

    const callEvent = await createCallEvent({
      patient_id: patient.id,
      medication_id: medicationId,
      scheduled_time: new Date().toISOString(),
      call_type: call_type === 'diagnostic' ? 'diagnostic' : 'reminder',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0],
      audio_url: generatedCallAudio
    });

    console.log(`\n📞 [TELEPHONY]: Dialing ${targetPhone} via Africa's Talking (${call_type})...`);
    const callResult = await makeOutboundCall(targetPhone);
    console.log(`✓ [TELEPHONY RESULT]:`, JSON.stringify(callResult, null, 2));
    console.log(`======================================================\n`);

    if (callResult?.status === 'failed') {
      return res.status(502).json({
        status: 'failed',
        error: callResult.error || 'Telephony carrier rejected outbound call',
        callEvent,
        result: callResult
      });
    }

    res.json({
      status: 'success',
      callEvent,
      result: callResult
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
