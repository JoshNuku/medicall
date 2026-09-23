const { createDiagnosticResponse } = require('../db/queries/diagnosticResponses');
const { getCallEventById } = require('../db/queries/callEvents');
const { decideNextAction } = require('./agent');
const { handleUniversalKeys } = require('./voiceUniversalHandler');
const { buildVoiceResponse, buildGetDigits, buildSay } = require('../utils/xmlBuilder');

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
      ? `${baseUrl}/audio/twi_diagnostic_reason.mp3`
      : `${baseUrl}/audio/english_diagnostic_reason.mp3`;
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
  const callEvent = getCallEventById(callEventId);
  if (!callEvent) return buildVoiceResponse(buildSay('Thank you. Goodbye.'));

  const callbackUrl = `${baseUrl}/voice/diagnostic/confirm?callEventId=${callEventId}`;
  const universal = handleUniversalKeys(dtmfDigits, {
    patientId: callEvent.patient_id,
    replayCallbackUrl: callbackUrl
  });
  if (universal) return universal;

  const reason = REASON_MAP[dtmfDigits] || 'other';
  const diagResponse = createDiagnosticResponse({
    call_event_id: callEventId,
    patient_id: callEvent.patient_id,
    reason
  });

  const { updateCallOutcome } = require('../db/queries/callEvents');
  updateCallOutcome(callEventId, 'confirmed', new Date().toISOString());

  await decideNextAction(callEvent.patient_id, callEvent.medication_id, {
    responseId: diagResponse.id,
    reason
  });

  const { getPatientById } = require('../db/queries/patients');
  const patient = getPatientById(callEvent.patient_id);
  const isTwi = (patient?.preferred_language || '').toLowerCase() !== 'english';

  if (isTwi) {
    const { buildPlay } = require('../utils/xmlBuilder');
    return buildVoiceResponse(buildPlay(`${baseUrl}/audio/twi_not_taken_ack.mp3`));
  }

  return buildVoiceResponse(buildSay('Thank you for your feedback. We have recorded your response and alerted your healthcare team. Take care.'));
};

module.exports = {
  generateDiagnosticXml,
  processDiagnosticConfirm
};
