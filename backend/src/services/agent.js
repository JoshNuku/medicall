const { sendChatCompletion } = require('./groqClient');
const { toolDefinitions, executeTool } = require('./agentTools');
const { addConversationMessage } = require('../db/queries/agentConversations');
const { getPatientFullContext, buildSystemPrompt, buildDiagnosticSystemPrompt } = require('./agentContextService');
const decisionEngine = require('./decisionEngine');

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * Core Agent loop with Groq API and optional tool calling.
 */
const agent = async ({ prompt, model = DEFAULT_MODEL, patientId = null, systemPrompt = null, tools = [], maxIterations = 3, temperature = 0.2 }) => {
  let messages = [];

  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  if (patientId) await addConversationMessage({ patient_id: patientId, role: 'user', content: prompt });

  for (let i = 0; i < maxIterations; i++) {
    const result = await sendChatCompletion({ model, messages, tools, temperature });
    if (!result || !result.choices || result.choices.length === 0) break;

    const message = result.choices[0].message;
    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const call of message.tool_calls) {
        console.log(`\n🧠 [GROQ LLM CHOSE TOOL]: "${call.function.name}"`);
        const args = JSON.parse(call.function.arguments || '{}');
        const toolResult = await executeTool(call.function.name, args);
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) });
      }
    } else {
      const finalContent = message.content || '';
      if (patientId) await addConversationMessage({ patient_id: patientId, role: 'assistant', content: finalContent });
      return { content: finalContent, messages };
    }
  }

  return { content: messages[messages.length - 1]?.content || '', messages };
};

/**
 * Phase 1: Generates purely spoken reminder text for outbound call (NO tools attached).
 */
const generateReminderMessage = async ({ patientId, medicationId, model = DEFAULT_MODEL }) => {
  const context = await getPatientFullContext(patientId, medicationId);
  const systemPrompt = context ? buildSystemPrompt(context) : null;
  const patientName = context?.patient?.name || 'there';
  const prompt = `Generate the concise reminder voice message for ${patientName} in plain English. Start with a brief personalized greeting ("Hello ${patientName}, hope you are doing well.") and keep the entire message under sixty words.`;

  const response = await agent({ prompt, model, patientId, systemPrompt, tools: [], temperature: 0.3 });
  return response.content;
};

/**
 * Phase 2: Hook for DTMF/keypress responses with full tool execution.
 */
const passResponseToAgent = async ({ patientId, medicationId, dtmfDigits, callEventId = null, model = DEFAULT_MODEL }) => {
  const context = await getPatientFullContext(patientId, medicationId);
  const baseSystemPrompt = context ? buildSystemPrompt(context) : '';

  const triageInstructions = `
CRITICAL HEALTHCARE AGENT TRIAGE INSTRUCTIONS:
The patient just completed their phone call for Call Event #${callEventId || 'none'}.
The patient pressed keypad digit '${dtmfDigits}':
- Key '1' (Confirmed taken): Call 'do_nothing' with patient_id: ${patientId}.
- Key '2' (Felt better & stopped taking): Call 'escalate_case' with patient_id: ${patientId}, escalation_type: 'general_attention', details: 'Patient stopped taking medication early because they feel better. Requires antimicrobial resistance (AMR) / chronic adherence counseling.'.
- Key '3' (Need a refill / Cost barrier): Call 'escalate_case' with patient_id: ${patientId}, escalation_type: 'pharmacist_cost', details: 'Patient reported needing a refill or medication cost barrier during reminder call.'.
- Key '4' (Side effects / discomfort): Call 'escalate_case' with patient_id: ${patientId}, escalation_type: 'health_worker_side_effect', details: 'Patient reported side effects during reminder call.'.
- Key '0' (Requested pharmacist assistance): Call 'escalate_case' with patient_id: ${patientId}, escalation_type: 'patient_requested_help', details: 'Patient pressed 0 to speak directly with pharmacist.'.
Execute the single most appropriate tool autonomously.
`;

  const systemPrompt = `${baseSystemPrompt}\n\n${triageInstructions}`;
  const prompt = `Patient selected option '${dtmfDigits}'. Evaluate clinical context and trigger necessary tools.`;

  return agent({ prompt, model, patientId, systemPrompt, tools: toolDefinitions });
};

const decideNextAction = async (patientId, medicationId, diagnosticContext = null) => {
  return decisionEngine.decideNextAction(patientId, medicationId, diagnosticContext);
};

/**
 * Generates the phone diagnostic check-in voice message for assessing non-adherence barriers.
 */
const generateDiagnosticMessage = async ({ patientId, medicationId, model = DEFAULT_MODEL }) => {
  const context = await getPatientFullContext(patientId, medicationId);
  const systemPrompt = context ? buildDiagnosticSystemPrompt(context) : null;
  const prompt = `Conduct an empathetic phone check-in for ${context?.patient?.name || 'the patient'} regarding their ${context?.primaryMed?.drug_name || 'medication'}. Gently ask why they were unable to take their medication, and clearly instruct them to press number one for cost or refill challenges, press number two for side effects or feeling unwell, press number three if they forgot, or press number four for any other reason. Press number nine to repeat, or press number zero to reach their pharmacist.`;

  const response = await agent({ prompt, model, patientId, systemPrompt, tools: [], temperature: 0.2 });
  return response.content;
};

module.exports = {
  agent,
  generateReminderMessage,
  generateDiagnosticMessage,
  passResponseToAgent,
  decideNextAction
};
