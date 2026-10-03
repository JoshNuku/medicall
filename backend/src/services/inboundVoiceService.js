const fs = require('fs');
const path = require('path');
const { getPatientByPhoneNumber, getPatientById, resetCaregiverNotifiedAt } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { createCallEvent, getLatestPendingCallEventForPatient, updateCallOutcome } = require('../db/queries/callEvents');
const { createEscalation } = require('../db/queries/escalations');
const { buildVoiceResponse, buildSay, buildPlay, buildGetDigits } = require('../utils/xmlBuilder');
const { getRelistenAudioUrl } = require('./audioMergeService');
const { getCloudinaryAudioUrl } = require('./cloudinaryService');

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

  // If patient has multiple medications, provide IVR menu to choose which one to hear
  if (medications.length > 1) {
    const medChoices = medications
      .map((m, idx) => (isEnglish ? `Press ${idx + 1} for ${m.drug_name}.` : `Mia ${idx + 1} ma ${m.drug_name}.`))
      .join(' ');

    const promptText = isEnglish
      ? `Welcome to your MediCall prescription helpline. You have ${medications.length} active medications. ${medChoices} Press 9 to repeat, or Press 0 to speak with your pharmacist.`
      : `Akwaaba firi MediCall nnuro helpline. Wowɔ nnuro ${medications.length}. ${medChoices} Mia nkron sɛ wobɛtie bio, anaa mia hwee sɛ wobɛkasa akyerɛ wo duruyɛfoɔ.`;

    const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}`;
    const digitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 12,
      callbackUrl,
      sayText: promptText
    });
    return buildVoiceResponse(digitsXml);
  }

  // Single active medication: Play relisten audio!
  const activeMed = medications[0];
  const today = new Date().toISOString().split('T')[0];
  await createCallEvent({
    patient_id: patient.id,
    medication_id: activeMed.id,
    scheduled_time: new Date().toISOString(),
    actual_call_time: new Date().toISOString(),
    call_type: 'relisten',
    attempt_number: 1,
    dose_date: today
  });

  const relistenAudioUrl = getRelistenAudioUrl(activeMed, patient.preferred_language, baseUrl);
  console.log(`🔊 [INBOUND HELPLINE]: Serving relisten instruction for Patient #${patient.id} (${activeMed.drug_name}): ${relistenAudioUrl}`);

  const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${activeMed.id}`;
  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 12,
    callbackUrl,
    playUrl: relistenAudioUrl
  });
  return buildVoiceResponse(digitsXml);
};

const handleInboundSelect = async (patientId, dtmfDigits, baseUrl, medId = null) => {
  const patient = patientId ? await getPatientById(patientId) : null;
  if (!patient) return buildVoiceResponse(buildSay('Thank you. Goodbye.'));

  const isEnglish = (patient.preferred_language || '').toLowerCase() === 'english';
  const medications = await getMedicationsByPatientId(patient.id);

  if (!dtmfDigits || dtmfDigits === 'undefined') {
    console.log(`ℹ️ [INBOUND HELPLINE]: Call ended / timeout for Patient #${patient.id}`);
    return buildVoiceResponse('');
  }

  console.log(`\n==============================================`);
  console.log(`📱 [INBOUND HELPLINE KEYPRESS]: Key "${dtmfDigits}"`);
  console.log(`   Patient #${patient.id} (${patient.name}), Med ID: ${medId || 'none'}`);
  console.log(`==============================================`);

  // 1. Key 0: Request pharmacist help
  if (dtmfDigits === '0') {
    await createEscalation({
      patient_id: patient.id,
      escalation_type: 'patient_requested_help'
    });
    console.log(`✓ [INBOUND HELPLINE]: Escalated to pharmacist (patient_requested_help)`);
    const ackAudioFile = isEnglish ? 'en_pharmacist_alert.mp3' : 'twi_pharmacist_alert.mp3';
    const playUrl = getCloudinaryAudioUrl(ackAudioFile, baseUrl);
    if (playUrl) {
      return buildVoiceResponse(buildPlay(playUrl));
    }
    return buildVoiceResponse(
      buildSay(
        isEnglish
          ? 'Your pharmacist has been notified and will call you back shortly. Thank you for using MediCall. Goodbye.'
          : 'Yɛabɔ wo duruyɛfoɔ amanneɛ na ɔbɛfrɛ wo ntɛm ara. Medaase firi MediCall. Nante yie.'
      )
    );
  }

  // 2. Key 9: Repeat the prescription instruction
  if (dtmfDigits === '9') {
    console.log(`✓ [INBOUND HELPLINE]: Repeating prescription instruction (Key 9)`);
    if (medId) {
      const chosenMed = medications.find(m => m.id === parseInt(medId, 10)) || medications[0];
      const relistenAudioUrl = getRelistenAudioUrl(chosenMed, patient.preferred_language, baseUrl);
      const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${chosenMed.id}`;
      return buildVoiceResponse(buildGetDigits({
        numDigits: 1,
        timeout: 12,
        callbackUrl,
        playUrl: relistenAudioUrl
      }));
    }
    return await handleInboundCall(patient.phone_number, baseUrl);
  }

  // 3. Multi-medication selection (Key 1..N on initial menu when medId wasn't already selected)
  if (medications.length > 1 && !medId) {
    const index = parseInt(dtmfDigits, 10) - 1;
    if (index >= 0 && index < medications.length) {
      const chosenMed = medications[index];
      console.log(`✓ [INBOUND HELPLINE]: Selected medication #${index + 1}: ${chosenMed.drug_name}`);
      const relistenAudioUrl = getRelistenAudioUrl(chosenMed, patient.preferred_language, baseUrl);
      const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}&medId=${chosenMed.id}`;
      return buildVoiceResponse(buildGetDigits({
        numDigits: 1,
        timeout: 12,
        callbackUrl,
        playUrl: relistenAudioUrl
      }));
    }
  }

  // 4. Key 1: Confirm Dose (if caller wishes to confirm adherence during call-back)
  if (dtmfDigits === '1') {
    const pending = await getLatestPendingCallEventForPatient(patient.id);
    if (pending) {
      await updateCallOutcome(pending.id, 'confirmed', new Date().toISOString());
      await resetCaregiverNotifiedAt(patient.id);
    }
    console.log(`✓ [INBOUND HELPLINE]: Dose marked Confirmed Taken (Key 1)`);
    const ackAudioFile = isEnglish ? 'en_confirmed.mp3' : 'twi_confirmed.mp3';
    const playUrl = getCloudinaryAudioUrl(ackAudioFile, baseUrl);
    if (playUrl) {
      return buildVoiceResponse(buildPlay(playUrl));
    }
    return buildVoiceResponse(
      buildSay(
        isEnglish
          ? 'Thank you for confirming your medication. Stay healthy!'
          : 'Medaase. Yɛagye atom sɛ woafa wo nnuro no. Yɛma wo apɔmuden!'
      )
    );
  }

  // 5. Key 2: Dose Not Taken / Caller reports issue
  if (dtmfDigits === '2') {
    const pending = await getLatestPendingCallEventForPatient(patient.id);
    if (pending) {
      await updateCallOutcome(pending.id, 'not_taken', new Date().toISOString());
    }
    await createEscalation({
      patient_id: patient.id,
      escalation_type: 'patient_requested_help'
    });
    console.log(`✓ [INBOUND HELPLINE]: Dose recorded as Not Taken (Key 2) & pharmacist alerted`);
    const ackAudioFile = isEnglish ? 'en_side_effects.mp3' : 'twi_not_taken_ack.mp3';
    const playUrl = getCloudinaryAudioUrl(ackAudioFile, baseUrl);
    if (playUrl) {
      return buildVoiceResponse(buildPlay(playUrl));
    }
    return buildVoiceResponse(
      buildSay(
        isEnglish
          ? 'Thank you for letting us know. We have alerted your pharmacist to assist you. Goodbye.'
          : 'Medaase sɛ woaka akyerɛ yɛn. Yɛbɛbɔ wo duruyɛfoɔ amanneɛ sɛnea ɔbɛboa wo. Nante yie.'
      )
    );
  }

  // 6. Any other key: guide caller with trailer prompt
  console.log(`⚠️ [INBOUND HELPLINE]: Unrecognized keypress "${dtmfDigits}". Prompting trailer.`);
  const chosenMed = (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);
  const callbackUrl = `${baseUrl}/voice/inbound/select?patientId=${patient.id}${chosenMed ? `&medId=${chosenMed.id}` : ''}`;
  const trailerFile = isEnglish ? 'en_keypress_trailer.mp3' : 'twi_keypress_trailer.mp3';
  return buildVoiceResponse(buildGetDigits({
    numDigits: 1,
    timeout: 10,
    callbackUrl,
    playUrl: `${baseUrl}/audio/${trailerFile}`
  }));
};

module.exports = {
  handleInboundCall,
  handleInboundSelect
};
