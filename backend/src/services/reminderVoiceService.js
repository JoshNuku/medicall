const { CALL_OUTCOMES } = require('../config/constants');
const { getCallEventById, updateCallOutcome } = require('../db/queries/callEvents');
const { getMedicationById } = require('../db/queries/medications');
const { getPatientById, resetCaregiverNotifiedAt } = require('../db/queries/patients');
const { createDiagnosticResponse } = require('../db/queries/diagnosticResponses');
const { addConversationMessage } = require('../db/queries/agentConversations');
const { passResponseToAgent } = require('./agent');
const { handleUniversalKeys } = require('./voiceUniversalHandler');
const { buildVoiceResponse, buildGetDigits, buildSay } = require('../utils/xmlBuilder');

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

  // Check universal keys (9: repeat, 0: help)
  const universalResponse = handleUniversalKeys(dtmfDigits, {
    patientId: callEvent.patient_id,
    replayUrl: audioUrl,
    replayCallbackUrl: callbackUrl
  });

  if (universalResponse) {
    console.log(`✓ Universal key processed: ${dtmfDigits}`);
    return universalResponse;
  }

  const isAiAgentEnabled = process.env.ENABLE_AI_AGENT === 'true' && medication?.instruction_source !== 'recorded';

  let outcome = CALL_OUTCOMES.ANSWERED_NO_KEYPRESS;
  let responseMessage = 'Thank you. Goodbye.';

  if (isAiAgentEnabled) {
    // --- AI AGENT MODE: Instant Neutral Acknowledgment + Autonomous LLM Triage ---
    const patient = getPatientById(callEvent.patient_id);
    const isTwi = patient && patient.preferred_language === 'twi';

    if (dtmfDigits === '1') {
      outcome = CALL_OUTCOMES.CONFIRMED;
      resetCaregiverNotifiedAt(callEvent.patient_id);
      responseMessage = isTwi
        ? 'Medaase. Yɛagye atom sɛ woafa wo nnuro no. Yɛma wo apɔmuden!'
        : 'Thank you for confirming your medication. Stay healthy!';
      console.log('✓ [AI Mode] Dose Confirmed Taken');
    } else if (['2', '3', '4'].includes(dtmfDigits)) {
      outcome = CALL_OUTCOMES.NOT_TAKEN;
      responseMessage = isTwi
        ? "Medaase. Y'agye wo mmuae no ato hɔ. Yɛma wo apɔmuden!"
        : 'Thank you. Your response has been recorded. Stay healthy!';
      console.log(`✓ [AI Mode] Keypress ${dtmfDigits} acknowledged neutrally to caller.`);
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

    // 2. Dispatch to Groq Healthcare AI Triage Agent in the background
    console.log('🤖 Passing interaction context to Groq Autonomous AI Triage Agent...');
    passResponseToAgent({
      patientId: callEvent.patient_id,
      medicationId: medication.id,
      dtmfDigits,
      callEventId: callEvent.id
    })
      .then(result => {
        console.log('✓ [Groq AI Triage Decision Completed]:', result?.content || 'Tools executed successfully');
      })
      .catch(err => {
        console.error('❌ [Groq AI Triage Error]:', err.message);
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
