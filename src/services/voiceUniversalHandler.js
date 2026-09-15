const { UNIVERSAL_KEYS, ESCALATION_TYPES } = require('../config/constants');
const { createEscalation } = require('../db/queries/escalations');
const { buildVoiceResponse, buildSay, buildGetDigits } = require('../utils/xmlBuilder');

/**
 * Handles universal digits (9=repeat, 0=request help).
 * Returns an XML string if a universal key was handled, or null to proceed with specific call logic.
 */
const handleUniversalKeys = (digit, callContext = {}) => {
  const { patientId, replayUrl, replayCallbackUrl } = callContext;

  if (digit === UNIVERSAL_KEYS.REPEAT) {
    // 9 = Repeat current audio instruction / prompt
    const getDigitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 10,
      finishOnKey: '#',
      callbackUrl: replayCallbackUrl,
      playUrl: replayUrl
    });
    return buildVoiceResponse(getDigitsXml);
  }

  if (digit === UNIVERSAL_KEYS.REQUEST_HELP) {
    // 0 = Request help: log escalation and close call politely
    if (patientId) {
      createEscalation({
        patient_id: patientId,
        escalation_type: ESCALATION_TYPES.PATIENT_REQUEST_HELP
      });
    }

    const sayXml = buildSay('Thank you. A healthcare worker has been notified and will contact you shortly. Goodbye.');
    return buildVoiceResponse(sayXml);
  }

  return null;
};

module.exports = {
  handleUniversalKeys
};
