const express = require('express');
const router = express.Router();
const { getPatientById, getAllPatients } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { getCallEventById, createCallEvent, getTodayCallEvents } = require('../db/queries/callEvents');
const { generateReminderXml, processReminderConfirm } = require('../services/reminderVoiceService');
const { handleInboundCall, handleInboundSelect } = require('../services/inboundVoiceService');
const { generateDiagnosticXml, processDiagnosticConfirm } = require('../services/diagnosticVoiceService');
const { getCloudinaryAudioUrl } = require('../services/cloudinaryService');

/**
 * @openapi
 * /voice/simulate:
 *   post:
 *     tags: [Voice Simulation & Testing]
 *     summary: Simulate Africa's Talking IVR call flow & DTMF keypress
 *     description: Test and preview Africa's Talking voice call XML responses, Cloudinary audio playback, and AI agent triage without needing a live GSM phone call.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scenario]
 *             properties:
 *               scenario:
 *                 type: string
 *                 enum: [outbound_reminder_prompt, dtmf_keypress, inbound_helpline, diagnostic_prompt, diagnostic_reason]
 *                 example: "dtmf_keypress"
 *               patient_id:
 *                 type: integer
 *                 example: 1
 *               call_event_id:
 *                 type: integer
 *                 example: 1
 *               dtmf_digits:
 *                 type: string
 *                 example: "1"
 *                 description: "1=Confirmed, 2=Side Effects, 3=Cost, 4=Early Reminder, 9=Repeat, 0=Pharmacist Help"
 *     responses:
 *       200:
 *         description: Simulation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 scenario: { type: string }
 *                 xml: { type: string, description: "Raw Africa's Talking Voice XML sent to telecom carrier" }
 *                 audioUrl: { type: string, nullable: true, description: "Audio file URL played to patient" }
 *                 outcome: { type: string, nullable: true }
 *                 summary: { type: string }
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { scenario = 'outbound_reminder_prompt', patient_id, call_event_id, dtmf_digits = '1' } = req.body;
    const baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).trim().replace(/\/+$/, '');

    // Resolve patient
    let patient = null;
    if (patient_id) {
      patient = await getPatientById(Number(patient_id));
    }
    if (!patient) {
      const all = await getAllPatients();
      patient = all[0] || null;
    }

    if (!patient) {
      return res.status(400).json({ error: 'No enrolled patients found in database to simulate.' });
    }

    const meds = await getMedicationsByPatientId(patient.id);
    const primaryMed = meds[0] || null;

    // 1. Scenario: Outbound Reminder Prompt
    if (scenario === 'outbound_reminder_prompt') {
      let callEvent = null;
      if (call_event_id) {
        callEvent = await getCallEventById(Number(call_event_id));
      }
      if (!callEvent && primaryMed) {
        callEvent = await createCallEvent({
          patient_id: patient.id,
          medication_id: primaryMed.id,
          scheduled_time: new Date().toISOString(),
          actual_call_time: new Date().toISOString(),
          call_type: 'reminder',
          dose_date: new Date().toISOString().split('T')[0]
        });
      }

      const isEnglish = (primaryMed?.language || patient.preferred_language || '').toLowerCase() === 'english';
      const candidateAudio = primaryMed?.reminder_audio_url || primaryMed?.audio_url || (isEnglish ? '/audio/default-reminder-en.mp3' : '/audio/default-reminder.mp3');
      const audioUrl = getCloudinaryAudioUrl(candidateAudio, baseUrl);

      let sayText = null;
      if (isEnglish && primaryMed?.instruction_source !== 'recorded') {
        sayText = `Hello ${patient.name}, this is your MediCall reminder to take your ${primaryMed ? primaryMed.drug_name : 'medication'} now. Press 1 to confirm you have taken your medication. Press 2 for side effects. Press 3 for cost issues. Press 9 to repeat, or Press 0 for your pharmacist.`;
      }

      const xml = generateReminderXml(callEvent?.id || 1, audioUrl, baseUrl, sayText);

      return res.json({
        success: true,
        scenario: 'outbound_reminder_prompt',
        patient: { id: patient.id, name: patient.name, phone: patient.phone_number, language: patient.preferred_language },
        medication: primaryMed ? { id: primaryMed.id, name: primaryMed.drug_name } : null,
        callEventId: callEvent?.id || 1,
        audioUrl,
        xml,
        summary: `Simulated live call connection for ${patient.name}. Africa's Talking plays ${isEnglish ? 'English text-to-speech prompt' : 'Asante Twi audio'} and listens for keypad digits.`
      });
    }

    // 2. Scenario: DTMF Keypress Callback
    if (scenario === 'dtmf_keypress' || scenario === 'reminder_confirm') {
      let callEvent = null;
      if (call_event_id) {
        callEvent = await getCallEventById(Number(call_event_id));
      }
      if (!callEvent && primaryMed) {
        callEvent = await createCallEvent({
          patient_id: patient.id,
          medication_id: primaryMed.id,
          scheduled_time: new Date().toISOString(),
          actual_call_time: new Date().toISOString(),
          call_type: 'reminder',
          dose_date: new Date().toISOString().split('T')[0]
        });
      }

      const eventId = callEvent?.id || 1;
      const xml = await processReminderConfirm(eventId, String(dtmf_digits), baseUrl);

      const keyMeanings = {
        '1': 'Dose Confirmed Taken (Key 1)',
        '2': 'Side Effects Reported (Key 2) → Escalated to Healthcare Worker',
        '3': 'Cost / Refill Barrier (Key 3) → Escalated to Pharmacist',
        '4': 'Early Reminder Requested (Key 4) → Adaptive Cron Adjusted',
        '9': 'Repeat Prescription Requested (Key 9)',
        '0': 'Clinician Help Requested (Key 0) → Escalated'
      };

      return res.json({
        success: true,
        scenario: 'dtmf_keypress',
        callEventId: eventId,
        patient: { id: patient.id, name: patient.name },
        dtmfDigits: String(dtmf_digits),
        actionTaken: keyMeanings[String(dtmf_digits)] || `Digit ${dtmf_digits} received`,
        xml,
        summary: `Patient pressed "${dtmf_digits}" during call. Result: ${keyMeanings[String(dtmf_digits)] || 'Processed'}`
      });
    }

    // 3. Scenario: Inbound Helpline Dial
    if (scenario === 'inbound_helpline') {
      const xml = await handleInboundCall(patient.phone_number, baseUrl);
      return res.json({
        success: true,
        scenario: 'inbound_helpline',
        callerNumber: patient.phone_number,
        patient: { id: patient.id, name: patient.name },
        xml,
        summary: `Patient called MediCall helpline from ${patient.phone_number}. IVR identified patient and responded with prescription relisten options.`
      });
    }

    // 4. Scenario: Diagnostic Prompt
    if (scenario === 'diagnostic_prompt') {
      const isTwi = (patient.preferred_language || '').toLowerCase() !== 'english';
      const xml = generateDiagnosticXml(call_event_id || 1, baseUrl, isTwi);
      return res.json({
        success: true,
        scenario: 'diagnostic_prompt',
        callEventId: call_event_id || 1,
        language: isTwi ? 'twi' : 'english',
        xml,
        summary: `Diagnostic non-adherence survey prompt served. Africa's Talking prompts patient for 1=Cost, 2=Side effects, 3=Forgot, 4=Other.`
      });
    }

    // 5. Scenario: Diagnostic Reason Keypress
    if (scenario === 'diagnostic_reason') {
      const xml = await processDiagnosticConfirm(call_event_id || 1, String(dtmf_digits), baseUrl);
      const reasonLabels = { '1': 'cost', '2': 'side_effects', '3': 'forgot', '4': 'other' };
      return res.json({
        success: true,
        scenario: 'diagnostic_reason',
        callEventId: call_event_id || 1,
        dtmfDigits: String(dtmf_digits),
        reasonRecorded: reasonLabels[String(dtmf_digits)] || 'other',
        xml,
        summary: `Diagnostic reason "${reasonLabels[String(dtmf_digits)] || 'other'}" logged and evaluated by clinical decision engine.`
      });
    }

    return res.status(400).json({ error: `Unknown simulation scenario: "${scenario}". Supported: outbound_reminder_prompt, dtmf_keypress, inbound_helpline, diagnostic_prompt, diagnostic_reason.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
