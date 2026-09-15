const decisionEngine = require('./decisionEngine');

/**
 * MediCall Decision Agent
 *
 * Current MVP: Pass-through to the deterministic rule-based decision engine.
 * Future Enhancement: Replace pass-through below with Groq LLM API call
 * to synthesize personalized intervention recommendations.
 */
const decideNextAction = async (patientId, medicationId, diagnosticContext = null) => {
  // TODO: Future LLM Integration (e.g. Groq Llama 3 70B)
  // Call Groq API here with patient history, compliance trajectory, and Twi transcript
  // to generate contextual dynamic triage decisions before falling back.

  return decisionEngine.decideNextAction(patientId, medicationId, diagnosticContext);
};

module.exports = {
  decideNextAction
};
