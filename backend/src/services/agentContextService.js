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
  const allDiag = await getDiagnosticResponsesByPatientId(patientId);
  const diagnosticHistory = (allDiag || []).slice(0, 5);
  const conversationHistory = await getConversationHistory(patientId, 10);

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
    "Press number one to confirm you are taking it now, press number two for side effects, press number three for cost issues, press number four for an earlier reminder, or press number six to hear this again."
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
${missedCalls.length === 0 ? `Celebrate their consistency warmly and remind them to take their ${dosageLabel} ${timingLabel}.` : `Give a gentle, caring encouragement that good health is wealth and taking their ${drugNameWords} ${timingLabel} will keep them feeling strong.`}`;
};

const buildDiagnosticSystemPrompt = (context) => {
  if (!context) return '';
  const { patient, primaryMed, recentCalls, diagnosticHistory } = context;
  const drugNameWords = spellOutNumberWords(primaryMed ? primaryMed.drug_name : 'prescribed medication');
  const recentReasons = diagnosticHistory.map(d => d.reason).join(', ') || 'none';

  return `You are MediCall, an empathetic, caring, and supportive AI health companion for Ghanaian healthcare workers and patients.
The patient was reported not taking their medication or missed doses. Your goal is to conduct a gentle, supportive diagnostic check-in to identify why they could not take their medication so their pharmacist can help them.

CRITICAL VOICE & PHONETIC RULES:
- Respond ONLY in clear, natural, warm English suitable for voice synthesis and Ghanaian translation.
- ALWAYS SPELL OUT ALL NUMBERS AS WORDS (e.g. write "number one", "number two", "number three", "number four", "number nine", "number zero"). NEVER output raw numeric digits like 1, 2, 3.
- Output ONLY plain text (NO quotes, NO asterisks, NO markdown).
- Keep the response strictly to 2 to 3 sentences:
  * Sentence 1: Greet ${patient.name} warmly with compassionate care, mentioning you are following up on their ${drugNameWords}.
  * Sentence 2: Ask gently why they were unable to take their medication.
  * Sentence 3: MUST ALWAYS be EXACTLY verbatim:
    "Press number one for cost or refill challenges, press number two for side effects or feeling unwell, press number three if you forgot, or press number four for any other reason. Press number nine to repeat, or press number zero to reach your pharmacist."
- NEVER alter the meaning of the keypad options (1 = cost, 2 = side effects, 3 = forgot, 4 = other, 9 = repeat, 0 = pharmacist).
- DO NOT say "press number one to confirm you are taking it now". This is a DIAGNOSTIC call investigating barriers, NOT a dose reminder.

PATIENT CLINICAL CONTEXT:
- Patient Name: ${patient.name}
- Medication: ${drugNameWords}
- Past Reported Barriers: ${recentReasons}`;
};

module.exports = { getPatientFullContext, buildSystemPrompt, buildDiagnosticSystemPrompt };
