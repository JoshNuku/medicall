const { CALL_OUTCOMES } = require('../config/constants');
const { getCallEventById, updateCallOutcome } = require('../db/queries/callEvents');
const { getMedicationById } = require('../db/queries/medications');
const { resetCaregiverNotifiedAt } = require('../db/queries/patients');
const { handleUniversalKeys } = require('./voiceUniversalHandler');
const { buildVoiceResponse, buildGetDigits, buildSay } = require('../utils/xmlBuilder');

const generateReminderXml = (callEventId, audioUrl, baseUrl) => {
  const callbackUrl = `${baseUrl}/voice/reminder/confirm?callEventId=${callEventId}`;
  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 10,
    finishOnKey: '#',
    callbackUrl,
    playUrl: audioUrl
  });
  return buildVoiceResponse(digitsXml);
};

const processReminderConfirm = (callEventId, dtmfDigits, baseUrl) => {
  const callEvent = getCallEventById(callEventId);
  if (!callEvent) {
    return buildVoiceResponse(buildSay('Thank you. Goodbye.'));
  }

  const medication = getMedicationById(callEvent.medication_id);
  const audioUrl = medication ? medication.audio_url : null;
  const callbackUrl = `${baseUrl}/voice/reminder/confirm?callEventId=${callEventId}`;

  // Check universal keys (9: repeat, 0: help)
  const universalResponse = handleUniversalKeys(dtmfDigits, {
    patientId: callEvent.patient_id,
    replayUrl: audioUrl,
    replayCallbackUrl: callbackUrl
  });

  if (universalResponse) {
    return universalResponse;
  }

  // Handle reminder-specific keypresses
  let outcome = CALL_OUTCOMES.ANSWERED_NO_KEYPRESS;
  let responseMessage = 'Thank you. Goodbye.';

  if (dtmfDigits === '1') {
    outcome = CALL_OUTCOMES.CONFIRMED;
    responseMessage = 'Thank you for confirming your medication. Stay healthy!';
    resetCaregiverNotifiedAt(callEvent.patient_id);
  } else if (dtmfDigits === '2') {
    outcome = CALL_OUTCOMES.NOT_TAKEN;
    responseMessage = 'Thank you. We have recorded that your dose was not taken.';
  }

  updateCallOutcome(callEventId, outcome);
  return buildVoiceResponse(buildSay(responseMessage));
};

module.exports = {
  generateReminderXml,
  processReminderConfirm
};
