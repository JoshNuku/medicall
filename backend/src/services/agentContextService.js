const { getPatientById } = require('../db/queries/patients');
const { getMedicationsByPatientId, getMedicationById } = require('../db/queries/medications');
const { getRecentCallEventsForMedication } = require('../db/queries/callEvents');
const { getDiagnosticResponsesByPatientId } = require('../db/queries/diagnosticResponses');
const { getConversationHistory } = require('../db/queries/agentConversations');
const { getTemplateById } = require('../db/queries/templates');

const spellOutNumberWords = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\b1\b/g, 'one')
    .replace(/\b2\b/g, 'two')
    .replace(/\b3\b/g, 'three')
    .replace(/\b4\b/g, 'four')
    .replace(/\b5\b/g, 'five')
    .replace(/\b10\b/g, 'ten')
    .replace(/\b15\b/g, 'fifteen')
    .replace(/\b500mg\b/gi, 'five hundred milligrams')
    .replace(/\b250mg\b/gi, 'two hundred and fifty milligrams')
    .replace(/\b1000mg\b/gi, 'one thousand milligrams')
    .replace(/\b1g\b/gi, 'one gram');
};

const getPatientFullContext = async (patientId, medicationId = null) => {
  const patient = await getPatientById(patientId);
  if (!patient) return null;

  const medications = medicationId
    ? [(await getMedicationById(medicationId))].filter(Boolean)
    : await getMedicationsByPatientId(patientId);

  const primaryMed = medications[0] || null;
  const recentCalls = primaryMed ? await getRecentCallEventsForMedication(primaryMed.id, 5) : [];
  const diagnosticHistory = ((await getDiagnosticResponsesByPatientId(patientId)) || []).slice(0, 5);
  const conversationHistory = (await getConversationHistory(patientId, 10)) || [];

  let dosageLabel = 'prescribed dose';
  let frequencyLabel = 'as directed';
  let timingLabel = 'with a glass of water';

  if (primaryMed) {
    if (primaryMed.dosage_template_id) {
      const t = await getTemplateById(primaryMed.dosage_template_id);
      if (t && t.label_english) dosageLabel = t.label_english;
    }
    if (primaryMed.frequency_template_id) {
      const t = await getTemplateById(primaryMed.frequency_template_id);
      if (t && t.label_english) frequencyLabel = t.label_english;
    }
    if (primaryMed.timing_template_id) {
      const t = await getTemplateById(primaryMed.timing_template_id);
      if (t && t.label_english) timingLabel = t.label_english;
    }
  }

  return {
    patient,
    medications,
    primaryMed,
    dosageLabel: spellOutNumberWords(dosageLabel),
    frequencyLabel: spellOutNumberWords(frequencyLabel),
    timingLabel: spellOutNumberWords(timingLabel),
    recentCalls,
    diagnosticHistory,
    conversationHistory
  };
};

const buildSystemPrompt = (context) => {
  const { patient, primaryMed, dosageLabel, frequencyLabel, timingLabel, recentCalls, diagnosticHistory } = context;
  const missedCalls = (recentCalls || []).filter(c => ['not_taken', 'no_answer', 'answered_no_keypress'].includes(c.outcome));
  const recentReasons = (diagnosticHistory || []).map(d => d.reason).join(', ') || 'none';
  const drugNameWords = spellOutNumberWords(primaryMed ? primaryMed.drug_name : 'prescribed medication');

  return `You are MediCall, an empathetic, caring, and delightfully warm AI health companion with a light touch of Ghanaian cheer.
You are calling ${patient.name} to remind them to take their medication: ${drugNameWords}.
Instructions: Take ${dosageLabel}, ${frequencyLabel}, ${timingLabel}.
Adherence History: ${recentCalls.length} recent calls, ${missedCalls.length} missed. Previous non-adherence barriers: ${recentReasons}.

CRITICAL TELEPHONY SCRIPT RULES:
1. Start with a brief personalized greeting under ten words: "Hello ${patient.name}, hope you are doing well." (Keep greeting brief—warm encouragement is already played at call end).
2. State the medication name and directions concisely: "Please take your ${drugNameWords}: ${dosageLabel} ${timingLabel}."
3. Always clearly recite the phone keypad choices using spelled out number words:
   - "Press number one to confirm you are taking it now."
   - "Press number two if you feel better and stopped taking it."
   - "Press number three if you need a refill or have cost issues."
   - "Press number four if you are experiencing side effects or discomfort."
   - "Press number zero to speak with your pharmacist, or press number six to repeat this message."
4. Never use markdown, bullet points, asterisks, brackets, or numbers in digits. Always spell out digits as words so text-to-speech speaks smoothly.
5. The entire output MUST be under sixty words so the phone call remains fast, focused, and under twenty-five seconds.`;
};

const buildDiagnosticSystemPrompt = (context) => {
  const { patient, primaryMed } = context;
  const drugNameWords = spellOutNumberWords(primaryMed ? primaryMed.drug_name : 'prescribed medication');

  return `You are MediCall, a respectful, empathetic clinical check-in caller speaking with ${patient.name}.
The patient missed their scheduled doses of ${drugNameWords}.
Your role is to gently find out what barrier they faced and offer support without judgment.

CRITICAL TELEPHONY SCRIPT RULES:
1. Start with a brief personalized greeting: "Hello ${patient.name}, hope you are doing well." (Keep greeting brief).
2. State that you are calling to see how they are doing and check why they could not take their ${drugNameWords}.
3. Give them the diagnostic phone keypad choices:
   - "Press number one if you need a refill or have cost challenges."
   - "Press number two for side effects or feeling unwell."
   - "Press number three if you feel better and stopped taking it."
   - "Press number four if you simply forgot or were away."
   - "Press number zero to reach your pharmacist directly, or press number six to hear this again."
4. Keep the entire response under sixty words. Absolutely no markdown, no asterisks, no bullet points. Spell out all digits as words (e.g. "number one", "number two").`;
};

module.exports = {
  getPatientFullContext,
  buildSystemPrompt,
  buildDiagnosticSystemPrompt
};
