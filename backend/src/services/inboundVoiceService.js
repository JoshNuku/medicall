const { getPatientByPhoneNumber } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { createCallEvent } = require('../db/queries/callEvents');
const { buildVoiceResponse, buildPlay, buildSay } = require('../utils/xmlBuilder');

const handleInboundCall = (callerNumber, baseUrl) => {
  const patient = callerNumber ? getPatientByPhoneNumber(callerNumber) : null;

  if (!patient) {
    return buildVoiceResponse(
      buildSay('Welcome to MediCall. Your phone number is not registered in our system. Please contact your clinic. Goodbye.')
    );
  }

  const medications = getMedicationsByPatientId(patient.id);
  const activeMed = medications.length > 0 ? medications[0] : null;

  if (!activeMed || !activeMed.audio_url) {
    return buildVoiceResponse(
      buildSay('You have no active medication instructions at this time. Thank you.')
    );
  }

  const today = new Date().toISOString().split('T')[0];
  createCallEvent({
    patient_id: patient.id,
    medication_id: activeMed.id,
    scheduled_time: new Date().toISOString(),
    actual_call_time: new Date().toISOString(),
    call_type: 'relisten',
    outcome: 'confirmed',
    attempt_number: 1,
    dose_date: today
  });

  const fullAudioUrl = activeMed.audio_url.startsWith('http')
    ? activeMed.audio_url
    : `${baseUrl}${activeMed.audio_url}`;

  return buildVoiceResponse(buildPlay(fullAudioUrl));
};

module.exports = {
  handleInboundCall
};
