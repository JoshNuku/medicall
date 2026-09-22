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

const getPatientFullContext = (patientId, medicationId = null) => {
  const patient = getPatientById(patientId);
  if (!patient) return null;

  const medications = medicationId
    ? [getMedicationById(medicationId)].filter(Boolean)
    : getMedicationsByPatientId(patientId);

  const primaryMed = medications[0] || null;
  const recentCalls = primaryMed ? getRecentCallEventsForMedication(primaryMed.id, 5) : [];
  const diagnosticHistory = getDiagnosticResponsesByPatientId(patientId).slice(0, 5);
  const conversationHistory = getConversationHistory(patientId, 10);

  let dosageLabel = 'prescribed dose';
  let frequencyLabel = 'as directed';
  let timingLabel = 'with a glass of water';

  if (primaryMed) {
    if (primaryMed.dosage_template_id) {
      const t = getTemplateById(primaryMed.dosage_template_id);
      if (t && t.label_english) dosageLabel = t.label_english;
    }
    if (primaryMed.frequency_template_id) {
      const t = getTemplateById(primaryMed.frequency_template_id);
      if (t && t.label_english) frequencyLabel = t.label_english;
    }
    if (primaryMed.timing_template_id) {
      const t = getTemplateById(primaryMed.timing_template_id);
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
  const missedCalls = recentCalls.filter(c => ['not_taken', 'no_answer', 'answered_no_keypress'].includes(c.outcome));
  const recentReasons = diagnosticHistory.map(d => d.reason).join(', ') || 'none';
  const drugNameWords = spellOutNumberWords(primaryMed ? primaryMed.drug_name : 'prescribed medication');

  return `You are MediCall, an empathetic, caring, and delightfully warm AI health companion with a light touch of Ghanaian cheer and encouragement.
Your goal is to make the patient smile, feel supported, and remember to take their medication accurately.

CRITICAL VOICE & PHONETIC RULES:
- Respond ONLY in clear, natural English suitable for high-quality voice synthesis and Ghanaian translation.
- ALWAYS SPELL OUT ALL NUMBERS AS WORDS (e.g. write "one tablet", "two capsules", "five hundred milligrams", "number one", "number two"). NEVER output raw numeric digits like 1, 2, 3.
- Output ONLY plain text (NO quotes, NO asterisks, NO markdown).
- Keep the response strictly to 2 sentences total:
  * Sentence 1: Greet ${patient.name} warmly and give their tailored reminder incorporating their specific dosage (${dosageLabel}) and meal timing (${timingLabel}) with an encouraging note.
  * Sentence 2: MUST ALWAYS be EXACTLY verbatim:
    "Press number one to confirm you are taking it now, press number two for side effects, press number three for cost issues, and press number four for an earlier reminder."
- NEVER alter or omit any of the keypad choices.

PATIENT CLINICAL CONTEXT:
- Patient Name: ${patient.name}
- Medication: ${drugNameWords}
- Dosage: ${dosageLabel}
- Meal / Timing Instruction: ${timingLabel}
- Schedule Frequency: ${frequencyLabel}
- Regimen: ${primaryMed?.is_chronic ? 'Ongoing chronic care' : 'Treatment regimen'}
- Recent Misses: ${missedCalls.length} | Past Reported Barriers: ${recentReasons}

STYLE INSTRUCTIONS:
- On track (0 misses): Celebrate their consistency warmly and remind them to take their ${dosageLabel} ${timingLabel}.
- If missed recently: Give a gentle, caring encouragement that good health is wealth and taking their ${drugNameWords} ${timingLabel} will keep them feeling strong.`;
};

module.exports = { getPatientFullContext, buildSystemPrompt };
