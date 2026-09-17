const { createPatient } = require('../src/db/queries/patients');
const { createMedication } = require('../src/db/queries/medications');
const { createCallEvent } = require('../src/db/queries/callEvents');
const { createDiagnosticResponse } = require('../src/db/queries/diagnosticResponses');
const { addConversationMessage, getConversationHistory } = require('../src/db/queries/agentConversations');
const { getPatientFullContext, buildSystemPrompt } = require('../src/services/agentContextService');
const { toolDefinitions, executeTool } = require('../src/services/agentTools');
const { agent, passResponseToAgent, decideNextAction } = require('../src/services/agent');

async function testAgentSetup() {
  console.log('--- Testing MediCall Agent Architecture ---');

  // 1. Create Patient & Medication
  const testPhone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;
  const patient = createPatient({
    phone_number: testPhone,
    name: 'Adwoa Mensah',
    preferred_language: 'twi',
    caregiver_phone: '+233541112233'
  });
  console.log('✓ Patient created:', patient.name, '(ID:', patient.id, ')');

  const med = createMedication({
    patient_id: patient.id,
    drug_name: 'Paracetamol',
    instruction_source: 'template',
    audio_url: '/audio/sample.mp3',
    schedule_times: '08:00, 14:00, 20:00',
    duration_days: 7,
    is_chronic: 0
  });
  console.log('✓ Medication created:', med.drug_name);

  // 2. Add missed call event and diagnostic barrier
  const callEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    outcome: 'not_taken',
    dose_date: new Date().toISOString().split('T')[0]
  });

  createDiagnosticResponse({
    call_event_id: callEvent.id,
    patient_id: patient.id,
    reason: 'forgot'
  });
  console.log('✓ Missed dose and diagnostic response recorded');

  // 3. Test Agent Conversation History Storage
  addConversationMessage({
    patient_id: patient.id,
    role: 'user',
    content: 'Hello, why am I taking this medicine?'
  });
  addConversationMessage({
    patient_id: patient.id,
    role: 'assistant',
    content: 'It is for pain relief.'
  });
  const history = getConversationHistory(patient.id);
  console.log('✓ Conversation history entries retrieved:', history.length);
  if (history.length < 2) throw new Error('Failed to retrieve conversation history');

  // 4. Test Context Builder
  const context = getPatientFullContext(patient.id, med.id);
  console.log('✓ Full context extracted for patient:', context.patient.name);
  const prompt = buildSystemPrompt(context);
  console.log('✓ System Prompt generated:\n' + prompt);
  if (!prompt.includes('Adwoa Mensah') || !prompt.includes('Paracetamol')) {
    throw new Error('Prompt missing required context fields');
  }

  // 5. Test Agent Tool Execution
  const escToolRes = await executeTool('escalate_case', {
    patient_id: patient.id,
    escalation_type: 'repeated_forgetting'
  });
  console.log('✓ Tool escalate_case created escalation ID:', escToolRes.escalation_id);

  const smsToolRes = await executeTool('notifybySMS', {
    patient_id: patient.id,
    recipient: 'caregiver',
    message: 'Adwoa missed her dose today.'
  });
  console.log('✓ Tool notifybySMS status:', smsToolRes.status);

  const cronToolRes = await executeTool('editCronReminder', {
    medication_id: med.id,
    mode: 'add_10min_pre_reminder'
  });
  console.log('✓ Tool editCronReminder adapted schedule (added 10-min pre-reminder):', cronToolRes.schedule);

  // 6. Test Decision Engine compatibility
  const decision = await decideNextAction(patient.id, med.id);
  console.log('✓ decideNextAction compatibility check:', decision);

  console.log('\nAll Agent architectural checks passed successfully!');
}

testAgentSetup().catch(err => {
  console.error('Agent test failed:', err);
  process.exit(1);
});
