const { getPatientByPhoneNumber, getPatientById } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { createCallEvent } = require('../db/queries/callEvents');
const { createEscalation } = require('../db/queries/escalations');
const { buildVoiceResponse, buildSay, buildPlay, buildGetDigits } = require('../utils/xmlBuilder');

const normalizeAudioUrl = (url, baseUrl) => {
  if (!url) return null;
  if (url.includes('localhost:3000')) {
    return url.replace(/http:\/\/localhost:3000/g, baseUrl);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

/**
 * Handles incoming call to MediCall helpline (+233308048104).
 * Menu navigation defaults to crisp English, and medication prescription audio
 * plays in whichever language was prescribed/generated on the dashboard (Twi or English).
 */
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
      buildSay('Welcome to MediCall. You have no active medication prescriptions on file at this time. Please contact your pharmacy. Goodbye.')
    );
  }

  // Multi-medication caller: Play clean English IVR menu
  if (medications.length > 1) {
    const medChoices = medications
      .map((m, idx) => `Press ${idx + 1} for ${m.drug_name}.`)
      .join(' ');

    const promptText = `Welcome to your MediCall prescription helpline. You have ${medications.length} active medications. ${medChoices} Or Press 0 to speak with your pharmacist.`;
    const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}`;

    console.log(`📞 [INBOUND MENU]: Serving English multi-med menu for Patient #${patient.id} (${medications.length} meds)`);
    const digitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 15,
      callbackUrl,
      sayText: promptText
    });
    return buildVoiceResponse(digitsXml);
  }

  // Single-medication caller: Play English intro, then prescription audio in selected language, then trailer
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

  const fullAudioUrl = normalizeAudioUrl(activeMed.audio_url || activeMed.reminder_audio_url, baseUrl);
  const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${activeMed.id}`;

  console.log(`📞 [INBOUND SINGLE]: Serving prescription for ${activeMed.drug_name} (Patient #${patient.id}) -> Audio: ${fullAudioUrl}`);

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 15,
    callbackUrl,
    sayText: `Welcome to MediCall. Here are your prescription instructions for ${activeMed.drug_name}. When finished, press 9 to repeat, or press 0 for your pharmacist.`,
    playUrl: fullAudioUrl
  });
  return buildVoiceResponse(digitsXml);
};

/**
 * Handles DTMF keypresses from the inbound IVR menu or medication playback.
 */
const handleInboundSelect = async (patientId, dtmfDigits, baseUrl, medId = null) => {
  const patient = patientId ? await getPatientById(patientId) : null;
  if (!patient) return buildVoiceResponse(buildSay('Thank you for calling MediCall. Goodbye.'));

  console.log(`\n==============================================`);
  console.log(`📱 [INBOUND KEYPRESS]: Patient #${patientId} pressed Key "${dtmfDigits}" (MedId context: ${medId || 'none'})`);
  console.log(`==============================================`);

  // Key 0: Request pharmacist help
  if (dtmfDigits === '0') {
    await createEscalation({
      patient_id: patient.id,
      escalation_type: 'patient_requested_help'
    });
    console.log(`🚨 [INBOUND ESCALATION]: Patient #${patient.id} requested pharmacist help via Key 0.`);
    return buildVoiceResponse(
      buildSay('Your pharmacist has been notified and will contact you shortly. Thank you for calling MediCall. Goodbye.')
    );
  }

  const medications = await getMedicationsByPatientId(patient.id);

  // Key 9: Replay context (replays specific medication if in med context, or replays full menu)
  if (dtmfDigits === '9') {
    if (medId) {
      const chosenMed = medications.find(m => m.id === parseInt(medId, 10));
      if (chosenMed) {
        const fullAudioUrl = normalizeAudioUrl(chosenMed.audio_url || chosenMed.reminder_audio_url, baseUrl);
        const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${chosenMed.id}`;
        console.log(`🔁 [INBOUND REPLAY]: Replaying instructions for ${chosenMed.drug_name}`);
        const digitsXml = buildGetDigits({
          numDigits: 1,
          timeout: 15,
          callbackUrl,
          sayText: `Replaying instructions for ${chosenMed.drug_name}. Press 9 to hear this again, or press 0 for your pharmacist.`,
          playUrl: fullAudioUrl
        });
        return buildVoiceResponse(digitsXml);
      }
    }
    return await handleInboundCall(patient.phone_number, baseUrl);
  }

  // Key 1..N: Selected specific medication from multi-med menu
  const index = parseInt(dtmfDigits, 10) - 1;
  const chosenMed = (index >= 0 && index < medications.length)
    ? medications[index]
    : (medId ? medications.find(m => m.id === parseInt(medId, 10)) : null);

  if (!chosenMed) {
    console.log(`⚠️ [INBOUND INVALID KEY]: Key "${dtmfDigits}" did not match any medication. Returning to menu.`);
    const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}`;
    const medChoices = medications
      .map((m, idx) => `Press ${idx + 1} for ${m.drug_name}.`)
      .join(' ');
    const retryPrompt = `Invalid choice. Please select from your active medications. ${medChoices} Or Press 0 for your pharmacist.`;
    const digitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 15,
      callbackUrl,
      sayText: retryPrompt
    });
    return buildVoiceResponse(digitsXml);
  }

  // Log relisten call event in database
  const today = new Date().toISOString().split('T')[0];
  await createCallEvent({
    patient_id: patient.id,
    medication_id: chosenMed.id,
    scheduled_time: new Date().toISOString(),
    actual_call_time: new Date().toISOString(),
    call_type: 'relisten',
    outcome: 'confirmed',
    attempt_number: 1,
    dose_date: today
  });

  const fullAudioUrl = normalizeAudioUrl(chosenMed.audio_url || chosenMed.reminder_audio_url, baseUrl);
  const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${chosenMed.id}`;

  console.log(`🔊 [INBOUND PLAY]: Playing prescription for ${chosenMed.drug_name} (Med #${chosenMed.id}) -> Audio: ${fullAudioUrl}`);

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 15,
    callbackUrl,
    sayText: `Here are your prescription instructions for ${chosenMed.drug_name}. Press 9 to hear this again, or press 0 for your pharmacist.`,
    playUrl: fullAudioUrl
  });
  return buildVoiceResponse(digitsXml);
};

module.exports = {
  handleInboundCall,
  handleInboundSelect
};
