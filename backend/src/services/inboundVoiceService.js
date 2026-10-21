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
      .map((m, idx) => {
        const hasDup = medications.filter(other => other.drug_name === m.drug_name).length > 1;
        let qualifier = '';
        if (hasDup) {
          if (m.instruction_source === 'recorded') {
            qualifier = isEnglish ? 'Pharmacist voice note' : 'Nkyerɛkyerɛ a yɛatwa agu so';
          } else {
            qualifier = isEnglish ? 'Standard prescription' : 'Nkyerɛkyerɛ a wɔagye atom';
          }
        }
        const name = qualifier ? `${m.drug_name} (${qualifier})` : m.drug_name;
        return isEnglish ? `Press ${idx + 1} for ${name}.` : `Mia ${idx + 1} ma ${name}.`;
      })
      .join(' ');

    const promptText = isEnglish
      ? `Welcome to your MediCall prescription helpline. You have ${medications.length} active medications. ${medChoices} Or press 0 to speak with your pharmacist.`
      : `Akwaaba firi MediCall nnuro helpline. Wowɔ nnuro ${medications.length}. ${medChoices} Anaa mia hwee ma wo duruyɛfoɔ.`;

    let menuPlayUrl = null;
    const medIdsKey = medications.map(m => m.id).join('_');
    const menuFilename = `inbound_menu_p${patient.id}_${medIdsKey}_${isEnglish ? 'en' : 'tw'}_v2.mp3`;
    const publicAudioDir = path.join(__dirname, '../../public/audio');
    const localMenuPath = path.join(publicAudioDir, menuFilename);

    if (fs.existsSync(localMenuPath)) {
      menuPlayUrl = `${baseUrl}/audio/${menuFilename}`;
    } else {
      try {
        if (isEnglish) {
          const { synthesizeEnglishSpeech } = require('./reminderPipelineService');
          const generated = await synthesizeEnglishSpeech(promptText, menuFilename);
          if (generated) menuPlayUrl = generated.startsWith('http') ? generated : `${baseUrl}${generated.startsWith('/') ? '' : '/'}${generated}`;
        } else {
          const { synthesizeTwiSpeech } = require('./khayaService');
          const generated = await synthesizeTwiSpeech(promptText, menuFilename, 'female', 0.88);
          if (generated) menuPlayUrl = generated.startsWith('http') ? generated : `${baseUrl}${generated.startsWith('/') ? '' : '/'}${generated}`;
        }
      } catch (synthErr) {
        console.warn('⚠️ [Inbound Menu Audio Synthesis Notice]:', synthErr.message);
      }
    }

    const callbackUrl = `${baseUrl}/voice/inbound/select/${patient.id}`;
    const digitsXml = buildGetDigits({
      numDigits: 1,
      timeout: 12,
      callbackUrl,
      playUrl: menuPlayUrl,
      sayText: menuPlayUrl ? null : promptText
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

  const relistenAudioUrl = getRelistenAudioUrl(activeMed, activeMed.language || patient.preferred_language, baseUrl);
  console.log(`🔊 [INBOUND HELPLINE]: Serving relisten instruction for Patient #${patient.id} (${activeMed.drug_name}): ${relistenAudioUrl}`);

  const callbackUrl = `${baseUrl}/voice/inbound/select/${patient.id}/${activeMed.id}`;
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

  const medications = await getMedicationsByPatientId(patient.id);
  const selectedMed = medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0];
  const isEnglish = ((selectedMed && selectedMed.language) || patient.preferred_language || '').toLowerCase() === 'english';

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
      const relistenAudioUrl = getRelistenAudioUrl(chosenMed, chosenMed.language || patient.preferred_language, baseUrl);
      const callbackUrl = `${baseUrl}/voice/inbound/select/${patient.id}/${chosenMed.id}`;
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
      const relistenAudioUrl = getRelistenAudioUrl(chosenMed, chosenMed.language || patient.preferred_language, baseUrl);
      const callbackUrl = `${baseUrl}/voice/inbound/select/${patient.id}/${chosenMed.id}`;
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
    } else {
      const today = new Date().toISOString().split('T')[0];
      const chosenMed = (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);
      await createCallEvent({
        patient_id: patient.id,
        medication_id: chosenMed ? chosenMed.id : null,
        scheduled_time: new Date().toISOString(),
        actual_call_time: new Date().toISOString(),
        call_type: 'relisten',
        outcome: 'confirmed',
        attempt_number: 1,
        dose_date: today
      });
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
    } else {
      const today = new Date().toISOString().split('T')[0];
      const chosenMed = (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);
      await createCallEvent({
        patient_id: patient.id,
        medication_id: chosenMed ? chosenMed.id : null,
        scheduled_time: new Date().toISOString(),
        actual_call_time: new Date().toISOString(),
        call_type: 'relisten',
        outcome: 'not_taken',
        attempt_number: 1,
        dose_date: today
      });
    }
    await createEscalation({
      patient_id: patient.id,
      escalation_type: 'patient_requested_help'
    });
    console.log(`✓ [INBOUND HELPLINE]: Dose recorded as Not Taken (Key 2) & pharmacist alerted`);

    const pharmacistPhone = process.env.PHARMACIST_PHONE || '+233272806050';
    const chosenMed = (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);
    const alertMessage = `🚨 [MediCall Alert]\nPatient: ${patient.name} (${patient.phone_number})\nMedication: ${chosenMed ? chosenMed.drug_name : 'Prescription'}\nIssue: DOSE NOT TAKEN\nCaller reported dose was not taken via helpline. Action required.`;
    const { sendSms } = require('./africasTalkingService');
    sendSms(pharmacistPhone, alertMessage).catch(err => console.warn('Failed to send pharmacist SMS alert on inbound:', err.message));
    const ackAudioFile = isEnglish ? 'en_diagnostic_ack.mp3' : 'twi_not_taken_ack.mp3';
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

  // 6. Any other key: guide caller with trailer prompt or re-prompt medication menu
  console.log(`⚠️ [INBOUND HELPLINE]: Unrecognized keypress "${dtmfDigits}".`);
  if (!medId && medications.length > 1) {
    return await handleInboundCall(patient.phone_number, baseUrl);
  }
  const chosenMed = (medId ? medications.find(m => m.id === parseInt(medId, 10)) : medications[0]);
  const callbackUrl = chosenMed
    ? `${baseUrl}/voice/inbound/select/${patient.id}/${chosenMed.id}`
    : `${baseUrl}/voice/inbound/select/${patient.id}`;
  const trailerFile = isEnglish ? 'en_keypress_menu.mp3' : 'twi_keypress_menu.mp3';
  const trailerUrl = getCloudinaryAudioUrl(trailerFile, baseUrl);
  return buildVoiceResponse(buildGetDigits({
    numDigits: 1,
    timeout: 10,
    callbackUrl,
    playUrl: trailerUrl
  }));
};

module.exports = {
  handleInboundCall,
  handleInboundSelect
};
