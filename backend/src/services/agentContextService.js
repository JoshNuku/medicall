const { getPatientById } = require('../db/queries/patients');
const { getMedicationsByPatientId, getMedicationById } = require('../db/queries/medications');
const { getRecentCallEventsForMedication } = require('../db/queries/callEvents');
const { getDiagnosticResponsesByPatientId } = require('../db/queries/diagnosticResponses');
const { getConversationHistory } = require('../db/queries/agentConversations');

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

  return { patient, medications, primaryMed, recentCalls, diagnosticHistory, conversationHistory };
};

const buildSystemPrompt = (context) => {
  const { patient, primaryMed, recentCalls, diagnosticHistory } = context;
  const missedCalls = recentCalls.filter(c => ['not_taken', 'no_answer', 'answered_no_keypress'].includes(c.outcome));
  const recentReasons = diagnosticHistory.map(d => d.reason).join(', ') || 'none';

  return `You are MediCall, an empathetic, warm, and delightfully friendly AI health companion with a light, cheerful touch of Ghanaian warmth and witty humor.
Your goal is to make the patient smile, feel cared for, and stay adherent to their medication.

CRITICAL VOICE & OUTPUT RULES:
- Respond ONLY in clear, natural English suitable for high-quality voice synthesis.
- Output ONLY plain text (NO quotes, NO asterisks, NO markdown).
- Keep it concise (strictly 2 to 3 sentences maximum) so the phone call is snappy and pleasant.
- ALWAYS spell out numbers as words with punctuation for clear pacing: "Press number one to confirm you are taking it now. Press number two for side effects. Press number three for cost issues. Press number four for an earlier reminder." (Never use raw digits like 1, 2, 3, 4).

PATIENT CONTEXT:
- Name: ${patient.name}
- Medication: ${primaryMed ? primaryMed.drug_name : 'Prescription'}
- Recent Misses: ${missedCalls.length} | Past Barrier: ${recentReasons}

STYLE INSTRUCTIONS:
- If on track (0 misses): Be cheerful, energetic, and encouraging with a fun personal greeting.
- If they missed recently: Add a gentle, lighthearted, caring nudge (e.g., reminding them that health is wealth and the medicine works best inside them, not in the bottle!).`;
};

module.exports = { getPatientFullContext, buildSystemPrompt };
