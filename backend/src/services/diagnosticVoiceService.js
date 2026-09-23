const { createDiagnosticResponse } = require('../db/queries/diagnosticResponses');
const { getCallEventById, updateCallOutcome } = require('../db/queries/callEvents');
const { getPatientById } = require('../db/queries/patients');
const { decideNextAction } = require('./agent');
const { handleUniversalKeys } = require('./voiceUniversalHandler');
const { buildVoiceResponse, buildGetDigits, buildSay, buildPlay } = require('../utils/xmlBuilder');
const { getStaticAudioUrl } = require('./cloudinaryService');

const DIAGNOSTIC_MENU = 'Why were you unable to take your medication? Press 1 for cost, 2 for side effects, 3 if you forgot, 4 for other reasons. Press 9 to repeat or 0 for help.';

const REASON_MAP = {
  '1': 'cost',
  '2': 'side_effects',
  '3': 'forgot',
  '4': 'other'
};

const generateDiagnosticXml = (callEventId, baseUrl, isTwi = false, customSay = null, customAudioUrl = null) => {
  const callbackUrl = `${baseUrl}/voice/diagnostic/confirm?callEventId=${callEventId}`;
  
  let playUrl = null;

  if (customAudioUrl) {
    playUrl = customAudioUrl.startsWith('http')
      ? customAudioUrl
      : `${baseUrl}${customAudioUrl.startsWith('/') ? '' : '/'}${customAudioUrl}`;
  } else {
    playUrl = isTwi
      ? getStaticAudioUrl('twi_diagnostic_reason', '/audio/twi_diagnostic_reason.mp3', baseUrl)
      : getStaticAudioUrl('english_diagnostic_reason', '/audio/english_diagnostic_reason.mp3', baseUrl);
  }

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 15,
    finishOnKey: '#',
    callbackUrl,
    playUrl,
    sayText: null // Use actual audio file for both English and Twi to eliminate carrier drops
  });
  return buildVoiceResponse(digitsXml);
};

const processDiagnosticConfirm = async (callEventId, dtmfDigits, baseUrl) => {
  const callEvent = await getCallEventById(callEventId);
  if (!callEvent) return buildVoiceResponse(buildSay('Thank you. Goodbye.'));

  const callbackUrl = `${baseUrl}/voice/diagnostic/confirm?callEventId=${callEventId}`;
  const universal = await handleUniversalKeys(dtmfDigits, {
    patientId: callEvent.patient_id,
    replayCallbackUrl: callbackUrl
  });
  if (universal) return universal;

  const reason = REASON_MAP[dtmfDigits] || 'other';
  const diagResponse = await createDiagnosticResponse({
    call_event_id: callEventId,
    patient_id: callEvent.patient_id,
    reason
  });

  await updateCallOutcome(callEventId, 'confirmed', new Date().toISOString());

  await decideNextAction(callEvent.patient_id, callEvent.medication_id, {
    responseId: diagResponse.id,
    reason
  });

  const patient = await getPatientById(callEvent.patient_id);
  const isTwi = (patient?.preferred_language || '').toLowerCase() !== 'english';

  if (isTwi) {
    const ackAudio = getStaticAudioUrl('twi_not_taken_ack', '/audio/twi_not_taken_ack.mp3', baseUrl);
    return buildVoiceResponse(buildPlay(ackAudio));
  }

  return buildVoiceResponse(buildSay('Thank you for your feedback. We have recorded your response and alerted your healthcare team. Take care.'));
};

module.exports = {
  generateDiagnosticXml,
  processDiagnosticConfirm
};
