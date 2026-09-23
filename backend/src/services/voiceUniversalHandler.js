const { UNIVERSAL_KEYS, ESCALATION_TYPES } = require('../config/constants');
const { createEscalation } = require('../db/queries/escalations');
const { buildVoiceResponse, buildSay, buildGetDigits } = require('../utils/xmlBuilder');

/**
 * Handles universal digits (9=repeat, 0=request help).
 * Returns an XML string if a universal key was handled, or null to proceed with specific call logic.
 */
const handleUniversalKeys = async (digit, callContext = {}) => {
  const { patientId, replayUrl, replayCallbackUrl } = callContext;

  if (digit === UNIVERSAL_KEYS.REPEAT || digit === UNIVERSAL_KEYS.REPEAT_ALT) {
    // 6 or 9 = Repeat current audio instruction / prompt
    const { replaySayText } = callContext;
    const getDigitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 12,
      finishOnKey: '#',
      callbackUrl: replayCallbackUrl,
      playUrl: replaySayText ? null : replayUrl,
      sayText: replaySayText || null
    });
    return buildVoiceResponse(getDigitsXml);
  }

  if (digit === UNIVERSAL_KEYS.REQUEST_HELP) {
    // 0 = Request help: log escalation and close call politely
    if (patientId) {
      await createEscalation({
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
