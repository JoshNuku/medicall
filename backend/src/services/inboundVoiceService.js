const { getPatientByPhoneNumber, getPatientById } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { createCallEvent } = require('../db/queries/callEvents');
const { createEscalation } = require('../db/queries/escalations');
const { buildVoiceResponse, buildSay, buildGetDigits } = require('../utils/xmlBuilder');

const handleInboundCall = async (callerNumber, baseUrl) => {
  const patient = callerNumber ? await getPatientByPhoneNumber(callerNumber) : null;

  if (!patient) {
    return buildVoiceResponse(
      buildSay('Welcome to MediCall prescription helpline. Your phone number is not registered in our system. Please contact your pharmacy. Goodbye.')
    );
  }

  const medications = await getMedicationsByPatientId(patient.id);

  if (!medications || medications.length === 0) {
    return buildVoiceResponse(
      buildSay('Welcome to MediCall. You have no active medication instructions on file at this time. Thank you.')
    );
  }

  const isEnglish = (patient.preferred_language || '').toLowerCase() === 'english';

  // If patient has multiple medications, provide IVR menu to choose which one to hear or stay on line
  if (medications.length > 1) {
    const medChoices = medications
      .map((m, idx) => (isEnglish ? `Press ${idx + 1} for ${m.drug_name}.` : `Mia ${idx + 1} ma ${m.drug_name}.`))
      .join(' ');

    const promptText = isEnglish
      ? `Welcome to your MediCall prescription helpline. You have ${medications.length} active medications. ${medChoices} Or stay on the line to hear all instructions. Press 9 to repeat, or Press 0 to speak with your pharmacist.`
      : `Akwaaba firi MediCall nnuro helpline. Wowɔ nnuro ${medications.length}. ${medChoices} Anaa tena so na tie ne nyinaa. Mia nkron sɛ wobɛtie bio, anaa mia hwee sɛ wobɛkasa akyerɛ wo duruyɛfoɔ.`;

    const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}`;
    const digitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 12,
      callbackUrl,
      sayText: promptText
    });
    return buildVoiceResponse(digitsXml);
  }

  // Single active medication: Play instruction immediately followed by keypress trailer
  const activeMed = medications[0];
  const today = new Date().toISOString().split('T')[0];
  await createCallEvent({
    patient_id: patient.id,
    medication_id: activeMed.id,
    scheduled_time: new Date().toISOString(),
    actual_call_time: new Date().toISOString(),
    call_type: 'relisten',
    outcome: 'confirmed',
    attempt_number: 1,
    dose_date: today
  });

  let fullAudioUrl = activeMed.audio_url;
  if (fullAudioUrl) {
    if (fullAudioUrl.includes('localhost:3000')) {
      fullAudioUrl = fullAudioUrl.replace(/http:\/\/localhost:3000/g, baseUrl);
    } else if (!fullAudioUrl.startsWith('http://') && !fullAudioUrl.startsWith('https://')) {
      fullAudioUrl = `${baseUrl}${fullAudioUrl.startsWith('/') ? '' : '/'}${fullAudioUrl}`;
    }
  }

  const trailerText = isEnglish
    ? 'Press 9 to hear this instruction again, or Press 0 to speak with your pharmacist.'
    : 'Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee sɛ wobɛkasa akyerɛ wo duruyɛfoɔ.';

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 10,
    callbackUrl: `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${activeMed.id}`,
    playUrl: fullAudioUrl,
    sayText: trailerText
  });
  return buildVoiceResponse(digitsXml);
};

const handleInboundSelect = async (patientId, dtmfDigits, baseUrl, medId = null) => {
  const patient = patientId ? await getPatientById(patientId) : null;
  if (!patient) return buildVoiceResponse(buildSay('Thank you. Goodbye.'));

  const isEnglish = (patient.preferred_language || '').toLowerCase() === 'english';

  // Key 0: Request pharmacist help
  if (dtmfDigits === '0') {
    await createEscalation({
      patient_id: patient.id,
      escalation_type: 'patient_requested_help'
    });
    const audioFile = isEnglish ? 'en_pharmacist_alert.mp3' : 'twi_pharmacist_alert.mp3';
    return buildVoiceResponse(buildPlay(`${baseUrl}/audio/${audioFile}`));
  }

  const medications = await getMedicationsByPatientId(patient.id);

  // Key 9: Repeat menu
  if (dtmfDigits === '9') {
    return await handleInboundCall(patient.phone_number, baseUrl);
  }

  // Key 1..N: Selected specific medication
  const index = parseInt(dtmfDigits, 10) - 1;
  const chosenMed = (index >= 0 && index < medications.length)
    ? medications[index]
    : (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);

  if (!chosenMed) {
    return await handleInboundCall(patient.phone_number, baseUrl);
  }

  let fullAudioUrl = chosenMed.audio_url;
  if (fullAudioUrl) {
    if (fullAudioUrl.includes('localhost:3000')) {
      fullAudioUrl = fullAudioUrl.replace(/http:\/\/localhost:3000/g, baseUrl);
    } else if (!fullAudioUrl.startsWith('http://') && !fullAudioUrl.startsWith('https://')) {
      fullAudioUrl = `${baseUrl}${fullAudioUrl.startsWith('/') ? '' : '/'}${fullAudioUrl}`;
    }
  }

  const trailerText = isEnglish
    ? `You just heard instructions for ${chosenMed.drug_name}. Press 9 to hear this again, or Press 0 to speak with your pharmacist.`
    : `Woatie wo nnuro ${chosenMed.drug_name} ho akwankyerɛ. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee sɛ wobɛkasa akyerɛ wo duruyɛfoɔ.`;

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 10,
    callbackUrl: `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${chosenMed.id}`,
    playUrl: fullAudioUrl,
    sayText: trailerText
  });
  return buildVoiceResponse(digitsXml);
};

module.exports = {
  handleInboundCall,
  handleInboundSelect
};
