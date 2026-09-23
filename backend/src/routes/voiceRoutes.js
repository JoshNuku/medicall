const express = require('express');
const router = express.Router();
const { generateReminderXml, processReminderConfirm } = require('../services/reminderVoiceService');
const { getCallEventById, createCallEvent, getRecentCallEventsForMedication, getLatestPendingCallEventForPatient, updateCallOutcome } = require('../db/queries/callEvents');
const { getMedicationById, getMedicationsByPatientId } = require('../db/queries/medications');
const { getPatientByPhoneNumber, getPatientById } = require('../db/queries/patients');
const { getLatestAssistantMessage } = require('../db/queries/agentConversations');
const db = require('../db/connection');

/**
 * @openapi
 * /voice/reminder:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Outbound reminder call webhook
 *     description: Africa's Talking webhook invoked when reminder connects. Returns GetDigits and Play tags.
 */
const handleReminderCall = async (req, res, next) => {
  try {
    if (req.body.isActive === '0' || req.body.status === 'Completed') {
      const destPhone = req.body.destinationNumber;
      const callerPhone = req.body.callerNumber;
      const atNumber = process.env.AT_VOICE_PHONE_NUMBER;
      const targetPhone = callerPhone && callerPhone !== atNumber ? callerPhone : destPhone;
      const patient = (targetPhone ? await getPatientByPhoneNumber(targetPhone) : null) || (destPhone ? await getPatientByPhoneNumber(destPhone) : null);
      if (patient) {
        const pending = await getLatestPendingCallEventForPatient(patient.id);
        if (pending && !pending.outcome) {
          const isNotAnswered = req.body.status === 'NotAnswered' || req.body.callSessionState === 'NotAnswered' || req.body.hangupCause === 'USER_BUSY' || req.body.hangupCause === 'NO_ANSWER';
          const outcome = isNotAnswered ? 'no_answer' : 'answered_no_keypress';
          await updateCallOutcome(pending.id, outcome, new Date().toISOString());
        }
      }
      res.set('Content-Type', 'text/xml');
      return res.status(200).send('<Response/>');
    }

    let callEventId = req.query.callEventId || req.body.callEventId;
    let callEvent = callEventId ? await getCallEventById(callEventId) : null;
    let medication = callEvent ? await getMedicationById(callEvent.medication_id) : null;

    const callerPhone = req.body.callerNumber;
    const destPhone = req.body.destinationNumber;
    const atNumber = process.env.AT_VOICE_PHONE_NUMBER;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    // Inbound call auto-detection: If someone is dialing our helpline number
    const isCallToOurNumber = destPhone && atNumber && (destPhone === atNumber || destPhone.endsWith(atNumber.replace('+', '')));
    if (isCallToOurNumber && !req.query.callEventId && !req.body.callEventId) {
      const patient = callerPhone ? await getPatientByPhoneNumber(callerPhone) : null;
      const pendingEvent = patient ? await getLatestPendingCallEventForPatient(patient.id) : null;
      if (!pendingEvent) {
        const { handleInboundCall } = require('../services/inboundVoiceService');
        const xml = await handleInboundCall(callerPhone, baseUrl);
        res.set('Content-Type', 'text/xml');
        return res.status(200).send(xml);
      }
    }

    if (!callEvent) {
      // In outbound reminder calls from Africa's Talking, destinationNumber is the patient's phone!
      const targetPhone = destPhone || callerPhone;
      const patient = (targetPhone ? await getPatientByPhoneNumber(targetPhone) : null) || (callerPhone ? await getPatientByPhoneNumber(callerPhone) : null);

      if (patient) {
        // First check if a pending callEvent was already registered when outbound call was dispatched
        const pendingEvent = await getLatestPendingCallEventForPatient(patient.id);
        if (pendingEvent) {
          callEvent = pendingEvent;
          callEventId = callEvent.id;
          medication = await getMedicationById(callEvent.medication_id);
        } else {
          const meds = await getMedicationsByPatientId(patient.id);
          if (meds.length > 0) {
            medication = meds[0];
            callEvent = await createCallEvent({
              patient_id: patient.id,
              medication_id: medication.id,
              scheduled_time: new Date().toISOString(),
              actual_call_time: new Date().toISOString(),
              call_type: 'reminder',
              attempt_number: 1,
              dose_date: new Date().toISOString().split('T')[0]
            });
            callEventId = callEvent.id;
          }
        }
      }
    }

    if (callEvent && !callEvent.actual_call_time) {
      await db.query('UPDATE call_events SET actual_call_time = $1 WHERE id = $2', [new Date().toISOString(), callEvent.id]);
    }

    const patientObj = callEvent ? await getPatientById(callEvent.patient_id) : null;
    const medLang = medication?.language || (medication?.audio_url?.includes('_en') ? 'english' : (medication?.audio_url?.includes('twi') ? 'twi' : null));
    const isEnglish = medLang
      ? medLang === 'english'
      : (patientObj && (patientObj.preferred_language || '').toLowerCase() === 'english');

    // Branch directly to Diagnostic IVR if this is a diagnostic call
    if (callEvent && callEvent.call_type === 'diagnostic') {
      const { generateDiagnosticXml } = require('../services/diagnosticVoiceService');
      const audioToPlay = callEvent.audio_url || (isEnglish ? '/audio/english_diagnostic_reason.mp3' : '/audio/twi_diagnostic_reason.mp3');
      console.log(`🩺 [VOICE ROUTE]: Serving Diagnostic IVR audio (${audioToPlay}) for Patient #${patientObj?.id || 'unknown'}`);
      const xml = generateDiagnosticXml(callEventId, baseUrl, !isEnglish, null, audioToPlay);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(xml);
    }

    const isAiAgentEnabled = process.env.ENABLE_AI_AGENT === 'true';
    const medName = medication ? medication.drug_name : 'your medication';

    let audioUrl = null;
    let sayText = null;

    if (isEnglish) {
      const latestMsg = patientObj ? await getLatestAssistantMessage(patientObj.id) : null;
      if (isAiAgentEnabled) {
        sayText = (latestMsg && latestMsg.content)
          ? latestMsg.content
          : `Hello ${patientObj ? patientObj.name : 'there'}, this is your MediCall reminder to take your ${medName} now. Press 1 to confirm you are taking it now. Press 2 for side effects. Press 3 for cost issues. Press 4 for an earlier reminder. Press 9 to repeat, or Press 0 for your pharmacist.`;
      } else {
        sayText = `Hello ${patientObj ? patientObj.name : 'there'}, this is your MediCall reminder to take your ${medName} now. Press 1 to confirm you have taken your medication. Press 2 if not taken. Press 9 to repeat, or Press 0 for your pharmacist.`;
      }
      console.log(`🗣️ [VOICE ROUTE]: Serving English template reminder prompt (AI Agent: ${isAiAgentEnabled}):\n   "${sayText}"`);
    } else {
      // For Twi reminder calls: use pre-generated reminder audio, or medication audio, or fallback to default
      const candidateAudio = medication?.reminder_audio_url || (medication?.instruction_source === 'recorded' ? medication.audio_url : null);
      if (candidateAudio) {
        audioUrl = candidateAudio.startsWith('http') ? candidateAudio : `${baseUrl}${candidateAudio.startsWith('/') ? '' : '/'}${candidateAudio}`;
        console.log(`🔊 [VOICE ROUTE]: Serving personalized Asante Twi reminder audio (${audioUrl})`);
      } else {
        audioUrl = `${baseUrl}/audio/default-reminder.mp3`;
        console.log(`🔊 [VOICE ROUTE]: Serving default Asante Twi template reminder audio (${audioUrl})`);
      }
    }

    const xml = generateReminderXml(callEventId, audioUrl, baseUrl, sayText);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
};

router.post('/reminder', handleReminderCall);
router.post('/', handleReminderCall);

/**
 * @openapi
 * /voice/reminder/confirm:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Reminder keypress confirmation callback
 */
const handleReminderConfirm = async (req, res, next) => {
  try {
    let callEventId = req.query.callEventId || req.body.callEventId;
    if (!callEventId || callEventId === 'undefined') {
      const callerPhone = req.body.callerNumber;
      const destPhone = req.body.destinationNumber;
      const patient = (callerPhone ? await getPatientByPhoneNumber(callerPhone) : null) || (destPhone ? await getPatientByPhoneNumber(destPhone) : null);
      if (patient) {
        const meds = await getMedicationsByPatientId(patient.id);
        if (meds.length > 0) {
          const recents = await getRecentCallEventsForMedication(meds[0].id, 1);
          if (recents.length > 0) {
            callEventId = recents[0].id;
          }
        }
      }
    }

    const dtmfDigits = req.body.dtmfDigits || req.query.dtmfDigits;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    const xml = await processReminderConfirm(callEventId, dtmfDigits, baseUrl);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
};

router.post('/reminder/confirm', handleReminderConfirm);
router.post('/confirm', handleReminderConfirm);

module.exports = {
  router,
  handleReminderCall,
  handleReminderConfirm
};
