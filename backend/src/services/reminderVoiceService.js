const { CALL_OUTCOMES } = require('../config/constants');
const { getCallEventById, updateCallOutcome } = require('../db/queries/callEvents');
const { getMedicationById } = require('../db/queries/medications');
const { getPatientById, resetCaregiverNotifiedAt } = require('../db/queries/patients');
const { createDiagnosticResponse } = require('../db/queries/diagnosticResponses');
const { addConversationMessage } = require('../db/queries/agentConversations');
const { passResponseToAgent } = require('./agent');
const { handleUniversalKeys } = require('./voiceUniversalHandler');
const { buildVoiceResponse, buildGetDigits, buildSay, buildPlay } = require('../utils/xmlBuilder');

const generateReminderXml = (callEventId, audioUrl, baseUrl, sayText = null) => {
  const callbackUrl = `${baseUrl}/voice/reminder/confirm?callEventId=${callEventId || ''}`;
  let fullAudioUrl = audioUrl;
  if (audioUrl) {
    if (audioUrl.includes('localhost:3000')) {
      fullAudioUrl = audioUrl.replace(/http:\/\/localhost:3000/g, baseUrl);
    } else if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
      fullAudioUrl = `${baseUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
    }
  }

  const digitsXml = buildGetDigits({
    numDigits: 1,
    timeout: 12,
    callbackUrl,
    playUrl: sayText ? null : fullAudioUrl,
    sayText: sayText || null
  });
  return buildVoiceResponse(digitsXml);
};

const processReminderConfirm = async (callEventId, dtmfDigits, baseUrl) => {
  // If no keypress was entered (e.g. hangup or call completed webhook)
  if (!dtmfDigits || dtmfDigits === 'undefined') {
    console.log(`ℹ️ [CALL HANGUP / SESSION END] Call Event: ${callEventId || 'none'}. No DTMF keypress entered.`);
    return buildVoiceResponse('');
  }

  console.log(`\n==============================================`);
  console.log(`📱 [DTMF KEYPRESS RECEIVED] -> Key: "${dtmfDigits}"`);
  console.log(`   Call Event: ${callEventId || 'unknown'}`);
  console.log(`==============================================`);

  const callEvent = getCallEventById(callEventId);
  if (!callEvent) {
    console.log('⚠️ No call event found for ID:', callEventId);
    return buildVoiceResponse(buildSay('Thank you. Goodbye.'));
  }

  const medication = getMedicationById(callEvent.medication_id);
  const audioUrl = medication ? medication.audio_url : null;
  const callbackUrl = `${baseUrl}/voice/reminder/confirm?callEventId=${callEventId}`;

  const patient = getPatientById(callEvent.patient_id);
  const medLang = medication?.language || (medication?.audio_url?.includes('_en') ? 'english' : (medication?.audio_url?.includes('twi') ? 'twi' : null));
  const isEnglish = medLang ? medLang === 'english' : (patient && (patient.preferred_language || '').toLowerCase() === 'english');
  const isTwi = !isEnglish;
  let replaySayText = null;

  if (isEnglish && medication?.instruction_source !== 'recorded') {
    const { getLatestAssistantMessage } = require('../db/queries/agentConversations');
    const latestMsg = patient ? getLatestAssistantMessage(patient.id) : null;
    replaySayText = latestMsg?.content || `Hello ${patient ? patient.name : 'there'}, this is your MediCall reminder to take your ${medication ? medication.drug_name : 'medication'} now. Press number one to confirm you are taking it now, press number two for side effects, press number three for cost issues, press number four for an earlier reminder, or press number six to hear this again.`;
  }

  // Check universal keys (6/9: repeat, 0: help)
  const universalResponse = handleUniversalKeys(dtmfDigits, {
    patientId: callEvent.patient_id,
    replayUrl: audioUrl,
    replaySayText,
    replayCallbackUrl: callbackUrl
  });

  if (universalResponse) {
    console.log(`✓ Universal key processed: ${dtmfDigits} (Replaying instruction)`);
    return universalResponse;
  }

  const isAiAgentEnabled = process.env.ENABLE_AI_AGENT === 'true' && medication?.instruction_source !== 'recorded';

  let outcome = CALL_OUTCOMES.ANSWERED_NO_KEYPRESS;
  let responseMessage = 'Thank you. Goodbye.';

  if (isAiAgentEnabled) {
    // --- AI AGENT MODE: Instant Neutral Acknowledgment + Autonomous LLM Triage ---
    // isTwi already computed from medication language

    if (dtmfDigits === '1') {
      outcome = CALL_OUTCOMES.CONFIRMED;
      resetCaregiverNotifiedAt(callEvent.patient_id);
      responseMessage = isTwi
        ? 'Medaase. Yɛagye atom sɛ woafa wo nnuro no. Yɛma wo apɔmuden!'
        : `Thank you for confirming your medication, ${patient ? patient.name : 'there'}! Stay healthy and have a wonderful day.`;
      console.log('✓ [AI Mode] Dose Confirmed Taken');
    } else if (dtmfDigits === '2') {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = isTwi
        ? "Medaase sɛ woaka akyerɛ yɛn. Yɛde nsunsuansoɔ no reto dɔkota no anim ntɛm ara."
        : 'Thank you for letting us know. Your safety is our top priority—we are alerting your healthcare team right now to check on these side effects.';
      console.log('✓ [AI Mode] Key 2: Side Effects reported. Immediate tailored voice returned.');
    } else if (dtmfDigits === '3') {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = isTwi
        ? "Medaase sɛ woaka ho asɛm. Yɛde bɛto aduruyɛfoɔ no anim sɛnea wɔbɛboa wo."
        : 'Thank you for letting us know. We understand medication costs can be challenging—we are alerting your pharmacist to review options for you.';
      console.log('✓ [AI Mode] Key 3: Cost Barrier reported. Immediate tailored voice returned.');
    } else if (dtmfDigits === '4') {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = isTwi
        ? "Ɛnyɛ hwee koraa! Yɛbɛsakra bere no na yɛakae wo ntɛm ɔkyena."
        : 'No problem at all! We will adjust your schedule to give you an earlier reminder tomorrow.';
      console.log('✓ [AI Mode] Key 4: Schedule shift requested. Immediate tailored voice returned.');
    } else {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = isTwi
        ? "Medaase. Y'agye wo mmuae no ato hɔ. Yɛma wo apɔmuden!"
        : 'Thank you. Your response has been recorded. Stay healthy!';
    }

    // 1. Seed Conversation Memory
    const keyDescriptions = {
      '1': 'Pressed 1 (Confirmed dose taken)',
      '2': 'Pressed 2 (Reported side effects)',
      '3': 'Pressed 3 (Reported cost barrier)',
      '4': 'Pressed 4 (Reported forgot / early reminder request)'
    };
    addConversationMessage({
      patient_id: callEvent.patient_id,
      role: 'user',
      content: keyDescriptions[dtmfDigits] || `Pressed keypad digit '${dtmfDigits}'`
    });
    addConversationMessage({
      patient_id: callEvent.patient_id,
      role: 'assistant',
      content: responseMessage
    });

    // 2. Execute Groq Agent Tools Asynchronously in Background (Non-blocking)
    setImmediate(() => {
      console.log('\n🤖 [BACKGROUND AGENT TRIAGE]: Executing clinical tools for Key', dtmfDigits, '...');
      passResponseToAgent({
        patientId: callEvent.patient_id,
        medicationId: medication.id,
        dtmfDigits,
        callEventId: callEvent.id
      })
        .then(result => {
          console.log('✓ [Groq Agent Background Triage Completed]:', result?.content || 'Tools executed successfully');
        })
        .catch(err => {
          console.error('❌ [Groq Agent Background Error]:', err.message);
        });
    });

  } else {
    // --- CLASSIC JOSH FALLBACK / PHARMACIST RECORDED AUDIO MODE ---
    if (dtmfDigits === '1') {
      outcome = CALL_OUTCOMES.CONFIRMED;
      responseMessage = 'Thank you for confirming your medication. Stay healthy!';
      resetCaregiverNotifiedAt(callEvent.patient_id);
      console.log('✓ [Classic Mode] Key 1: Confirmed');
    } else if (dtmfDigits === '2') {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = 'Thank you. We have recorded that your dose was not taken.';
      console.log('✓ [Classic Mode] Key 2: Not Taken');
    } else {
      console.log(`⚠️ [Classic Mode] Unhandled keypress: "${dtmfDigits}"`);
    }
  }

  updateCallOutcome(callEventId, outcome);

  const patientForAudio = getPatientById(callEvent.patient_id);
  const isTwiCaller = patientForAudio && (patientForAudio.preferred_language || '').toLowerCase() !== 'english';

  if (isTwiCaller) {
    const audioFile = outcome === CALL_OUTCOMES.CONFIRMED ? 'twi_confirmed.mp3' : 'twi_not_taken_ack.mp3';
    return buildVoiceResponse(buildPlay(`${baseUrl}/audio/${audioFile}`));
  }

  return buildVoiceResponse(buildSay(responseMessage));
};

module.exports = {
  generateReminderXml,
  processReminderConfirm
};
