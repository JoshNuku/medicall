const express = require('express');
const router = express.Router();
const { getTodayCallEvents, createCallEvent } = require('../db/queries/callEvents');
const { getPatientById, getPatientByPhoneNumber } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { makeOutboundCall } = require('../services/africasTalkingService');
const { preGenerateReminderAudio, generateDiagnosticAudio } = require('../services/reminderPipelineService');
const { validatePhone } = require('../utils/phoneUtils');

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

    const phoneValidation = validatePhone(targetPhone, true);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error, status: 400 });
    }
    const validatedPhone = phoneValidation.normalized;

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

    // 1. Create immediate Call Event record with outcome 'pending'
    const callEvent = createCallEvent({
      patient_id: patient ? patient.id : 1,
      medication_id: medicationId || 1,
      scheduled_time: new Date().toISOString(),
      call_type: call_type === 'diagnostic' ? 'diagnostic' : 'reminder',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0],
      audio_url: null
    });

    // 2. Respond immediately to the client (<50ms) so UI is completely non-blocking
    res.json({
      status: 'success',
      callEvent,
      message: 'Call initiated. AI agent is personalizing voice prompt and dialing patient in the background.'
    });

    // 3. Dispatch Agent Personalization & Telephony in background
    setImmediate(async () => {
      let generatedCallAudio = null;
      const db = require('../db/connection');

      if (patient && medicationId) {
        const med = getMedicationById(medicationId);
        if (med && med.instruction_source !== 'recorded') {
          try {
            if (call_type === 'reminder') {
              console.log(`\n🤖 [AI PIPELINE]: Background generating personalized reminder for Patient #${patient.id}...`);
              const audioResult = await preGenerateReminderAudio({
                patientId: patient.id,
                medicationId: medicationId,
                speakerId: 'female'
              });
              if (typeof audioResult === 'string' && audioResult.startsWith('/audio/')) {
                generatedCallAudio = audioResult;
                try {
                  db.prepare('UPDATE medications SET reminder_audio_url = ? WHERE id = ?').run(audioResult, medicationId);
                } catch (_) {}
              }
            } else if (call_type === 'diagnostic') {
              console.log(`\n🩺 [DIAGNOSTIC PIPELINE]: Background synthesizing AI diagnostic audio for Patient #${patient.id}...`);
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
            console.warn('⚠️ [Call Trigger Background] AI Audio generation notice:', genErr.message);
          }
        }
      }

      if (generatedCallAudio) {
        try {
          db.prepare('UPDATE call_events SET audio_url = ? WHERE id = ?').run(generatedCallAudio, callEvent.id);
        } catch (_) {}
      }

      try {
        console.log(`\n📞 [TELEPHONY]: Dialing ${validatedPhone} via Africa's Talking (${call_type})...`);
        const callResult = await makeOutboundCall(validatedPhone);
        console.log(`✓ [TELEPHONY RESULT]:`, JSON.stringify(callResult, null, 2));
      } catch (telephonyErr) {
        console.error(`⚠️ [TELEPHONY DISPATCH ERROR]:`, telephonyErr.message);
      }
      console.log(`======================================================\n`);
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
