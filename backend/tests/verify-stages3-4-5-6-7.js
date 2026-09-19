const { createPatient } = require('../src/db/queries/patients');
const { createMedication } = require('../src/db/queries/medications');
const { createCallEvent, updateCallOutcome } = require('../src/db/queries/callEvents');
const { getOpenEscalationsWithPatient } = require('../src/db/queries/escalations');
const { handleInboundCall } = require('../src/services/inboundVoiceService');
const { generateDiagnosticXml, processDiagnosticConfirm } = require('../src/services/diagnosticVoiceService');
const { decideNextAction } = require('../src/services/agent');
const { runSchedulerCycle, getCurrentHhMm } = require('../src/services/cronScheduler');
const { hasCollision } = require('../src/services/retryService');

async function testAllStages() {
  console.log('--- Testing Stages 3, 4, 5, 6, 7 ---');

  const testPhone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;
  const patient = createPatient({
    phone_number: testPhone,
    name: 'Kwame Nkrumah',
    preferred_language: 'twi',
    caregiver_phone: '+233546007121'
  });
  console.log('✓ Created patient for testing:', patient.id);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const currentHhMm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const medication = createMedication({
    patient_id: patient.id,
    drug_name: 'Metformin',
    instruction_source: 'template',
    audio_url: '/audio/test_twi.mp3',
    schedule_times: currentHhMm,
    duration_days: 14,
    is_chronic: 1
  });
  console.log('✓ Created medication with schedule matching now:', medication.schedule_times);

  // 1. Stage 3: Inbound Voice Flow
  const inboundXml = handleInboundCall(testPhone, 'http://localhost:3000');
  console.log('✓ Inbound XML contains Play:', inboundXml.includes('<Play'));
  if (!inboundXml.includes('<Play')) throw new Error('Inbound call should play medication audio');

  // 2. Stage 3: Diagnostic IVR Flow
  const callEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: medication.id,
    scheduled_time: now.toISOString(),
    call_type: 'reminder',
    dose_date: now.toISOString().split('T')[0]
  });

  const diagMenuXml = generateDiagnosticXml(callEvent.id, 'http://localhost:3000');
  console.log('✓ Diagnostic menu contains GetDigits:', diagMenuXml.includes('<GetDigits'));

  // Confirm with '1' (cost reason) -> triggers escalation 'pharmacist_cost'
  await processDiagnosticConfirm(callEvent.id, '1', 'http://localhost:3000');
  const escalations = getOpenEscalationsWithPatient();
  const costEsc = escalations.find(e => e.escalation_type === 'pharmacist_cost' && e.patient_id === patient.id);
  console.log('✓ Diagnostic cost escalation created:', !!costEsc);
  if (!costEsc) throw new Error('Expected pharmacist_cost escalation');

  // 3. Stage 4: Cron Scheduler Cycle
  await runSchedulerCycle(now);
  console.log('✓ Scheduler cycle completed without errors');

  // 4. Stage 4: Collision detection logic
  const retryTime1 = new Date();
  retryTime1.setHours(8, 20); // 08:20
  const scheduleTimes = '08:00, 09:00, 18:00'; // 09:00 is within 40 mins (<=60 mins)
  const isColliding = hasCollision(retryTime1, scheduleTimes);
  console.log('✓ Collision buffer correctly detected collision:', isColliding);
  if (!isColliding) throw new Error('Expected collision detection to be true');

  // 5. Stage 5: Decision Engine & Stage 7 Agent
  // Test same-day misses >= 2 triggers diagnostic
  const todayStr = now.toISOString().split('T')[0];
  const missed1 = createCallEvent({
    patient_id: patient.id,
    medication_id: medication.id,
    scheduled_time: now.toISOString(),
    actual_call_time: now.toISOString(),
    call_type: 'reminder',
    outcome: 'not_taken',
    dose_date: todayStr
  });
  const missed2 = createCallEvent({
    patient_id: patient.id,
    medication_id: medication.id,
    scheduled_time: now.toISOString(),
    actual_call_time: now.toISOString(),
    call_type: 'retry',
    outcome: 'no_answer',
    dose_date: todayStr
  });

  const decision = await decideNextAction(patient.id, medication.id);
  console.log('✓ Decision engine action for 2 same-day misses:', decision.action);
  if (decision.action !== 'trigger_diagnostic') {
    throw new Error('Expected trigger_diagnostic action for 2 same-day misses');
  }

  console.log('\nAll Stages 3, 4, 5, 6, and 7 tests passed successfully!');
}

testAllStages().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
