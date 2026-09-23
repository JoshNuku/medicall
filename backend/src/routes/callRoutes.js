const express = require('express');
const router = express.Router();
const { getTodayCallEvents, createCallEvent } = require('../db/queries/callEvents');
const { getPatientById, getPatientByPhoneNumber } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { makeOutboundCall } = require('../services/africasTalkingService');
const { preGenerateReminderAudio, generateDiagnosticAudio } = require('../services/reminderPipelineService');

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
router.get('/today', (req, res, next) => {
  try {
    const calls = getTodayCallEvents();
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
      patient = getPatientById(patient_id);
    } else if (phone_number) {
      patient = getPatientByPhoneNumber(phone_number);
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

    const { createMedication } = require('../db/queries/medications');
    let medicationId = null;
    if (patient) {
      const meds = getMedicationsByPatientId(patient.id);
      if (meds.length > 0) {
        medicationId = meds[0].id;
      } else {
        console.log(`ℹ️ [MEDICATION REGIMEN]: Patient #${patient.id} had no meds enrolled. Auto-creating baseline regimen...`);
        const newMed = createMedication({
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

    // Pre-generate AI audio depending on call type
    if (patient && medicationId) {
      try {
        if (call_type === 'reminder') {
          console.log(`\n🤖 [AI PIPELINE]: Generating personalized reminder for Patient #${patient.id}...`);
          const audioResult = await preGenerateReminderAudio({
            patientId: patient.id,
            medicationId: medicationId,
            speakerId: 'female'
          });
          if (typeof audioResult === 'string' && audioResult.startsWith('/audio/')) {
            generatedCallAudio = audioResult;
            const db = require('../db/connection');
            db.prepare('UPDATE medications SET reminder_audio_url = ? WHERE id = ?').run(audioResult, medicationId);
          }
        } else if (call_type === 'diagnostic') {
          console.log(`\n🩺 [DIAGNOSTIC PIPELINE]: Synthesizing AI diagnostic audio evaluation for Patient #${patient.id}...`);
          const diagAudio = await generateDiagnosticAudio({
            patientId: patient.id,
            medicationId: medicationId,
            speakerId: 'female'
          });
          if (typeof diagAudio === 'string' && diagAudio.startsWith('/audio/')) {
            generatedCallAudio = diagAudio;
            console.log(`   ✓ Diagnostic audio generated and attached: ${generatedCallAudio}`);
          }
        }
      } catch (genErr) {
        console.warn('⚠️ [Call Trigger] AI Audio generation notice:', genErr.message);
      }
    }

    const callEvent = createCallEvent({
      patient_id: patient ? patient.id : 1,
      medication_id: medicationId || 1,
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
