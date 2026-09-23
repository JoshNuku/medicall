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

    // Target phone may be in callerNumber or destinationNumber
    const targetPhone = (callerPhone && callerPhone !== atNumber) ? callerPhone : (destPhone && destPhone !== atNumber ? destPhone : destPhone || callerPhone);
    const patient = (targetPhone ? await getPatientByPhoneNumber(targetPhone) : null) || (callerPhone ? await getPatientByPhoneNumber(callerPhone) : null) || (destPhone ? await getPatientByPhoneNumber(destPhone) : null);

    // 1. If there is a pending outbound call event for this patient, it is ALWAYS an outbound call!
    if (!callEvent && patient) {
      const pendingEvent = await getLatestPendingCallEventForPatient(patient.id);
      if (pendingEvent) {
        callEvent = pendingEvent;
        callEventId = callEvent.id;
        medication = await getMedicationById(callEvent.medication_id);
      }
    }

    // 2. Only treat as Inbound Helpline if there is NO pending outbound event AND caller dialed our virtual number
    const isDirectionInbound = req.body.direction === 'Inbound';
    const isOutboundCall = req.body.direction === 'Outbound';
    const isCallToOurNumber = !callEvent && (
      (destPhone && atNumber && (destPhone === atNumber || destPhone.endsWith(atNumber.replace('+', '')))) ||
      (isDirectionInbound && !isOutboundCall && callerPhone !== atNumber)
    );

    if (isCallToOurNumber && !req.query.callEventId && !req.body.callEventId) {
      console.log(`\n📞 [INBOUND HELPLINE CALL]: Incoming call from ${callerPhone} to MediCall Helpline (${destPhone})`);
      const { handleInboundCall } = require('../services/inboundVoiceService');
      const xml = await handleInboundCall(callerPhone, baseUrl);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(xml);
    }

    if (!callEvent && patient) {
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
      const { getStaticAudioUrl } = require('../services/cloudinaryService');
      const defaultDiagnostic = isEnglish
        ? getStaticAudioUrl('english_diagnostic_reason', '/audio/english_diagnostic_reason.mp3', baseUrl)
        : getStaticAudioUrl('twi_diagnostic_reason', '/audio/twi_diagnostic_reason.mp3', baseUrl);
      const audioToPlay = callEvent.audio_url || defaultDiagnostic;
      console.log(`🩺 [VOICE ROUTE]: Serving Diagnostic IVR audio (${audioToPlay}) for Patient #${patientObj?.id || 'unknown'}`);
      const xml = generateDiagnosticXml(callEventId, baseUrl, !isEnglish, null, audioToPlay);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(xml);
    }

    const isAiAgentEnabled = process.env.ENABLE_AI_AGENT === 'true';
    const medName = medication ? medication.drug_name : 'your medication';

    let audioUrl = null;
    const candidateAudio = callEvent?.audio_url || medication?.reminder_audio_url || (medication?.instruction_source === 'recorded' ? medication.audio_url : null);

    if (candidateAudio) {
      audioUrl = candidateAudio.startsWith('http') ? candidateAudio : `${baseUrl}${candidateAudio.startsWith('/') ? '' : '/'}${candidateAudio}`;
      console.log(`🔊 [VOICE ROUTE]: Serving high-fidelity reminder audio track (${audioUrl}) for Patient #${patientObj?.id || 'unknown'} [${isEnglish ? 'English' : 'Twi'}]`);
    } else {
      const { getStaticAudioUrl } = require('../services/cloudinaryService');
      audioUrl = isEnglish
        ? getStaticAudioUrl('default_reminder_en', '/audio/default-reminder-en.mp3', baseUrl)
        : getStaticAudioUrl('default_reminder', '/audio/default-reminder.mp3', baseUrl);
      console.log(`🔊 [VOICE ROUTE]: Serving default fallback reminder audio (${audioUrl}) [${isEnglish ? 'English' : 'Twi'}]`);
    }

    const xml = generateReminderXml(callEventId, audioUrl, baseUrl, null);
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
