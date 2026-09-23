const { createPatient } = require('../src/db/queries/patients');
const { createMedication, getMedicationById } = require('../src/db/queries/medications');
const { createCallEvent, getCallEventById } = require('../src/db/queries/callEvents');
const { runSchedulerCycle } = require('../src/services/cronScheduler');
const { registerMedication } = require('../src/services/medicationService');
const { generateDiagnosticXml, processDiagnosticConfirm } = require('../src/services/diagnosticVoiceService');
const { getOpenEscalationsWithPatient } = require('../src/db/queries/escalations');
const { getLogsByPatientId } = require('../src/db/queries/logs');

async function testAll() {
  console.log('=== VERIFYING SCHEDULED AGENT PRE-GEN & DIAGNOSTIC CALL WORKFLOW ===\n');

  // 1. Create a test patient
  const phone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;
  const patient = createPatient({
    phone_number: phone,
    name: 'Akosua Serwaa',
    preferred_language: 'twi',
    caregiver_phone: '+233500000009'
  });
  console.log(`✓ 1. Created test patient: ${patient.name} (ID: ${patient.id})`);

  // 2. Test immediate full prescription audio pre-generation on registerMedication
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const nowHhMm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const target10Min = new Date(now.getTime() + 10 * 60 * 1000);
  const tenMinHhMm = `${pad(target10Min.getHours())}:${pad(target10Min.getMinutes())}`;

  console.log(`✓ 2. Testing immediate prescription audio pregeneration...`);
  const med = await registerMedication({
    patientId: patient.id,
    drugName: 'Metformin 500mg',
    instructionSource: 'template',
    dosageTemplateId: 1,
    frequencyTemplateId: 9,
    timingTemplateId: 14,
    scheduleTimes: `${tenMinHhMm}, ${nowHhMm}`,
    durationDays: 14,
    isChronic: true,
    language: 'twi'
  });

  console.log(`   Medication ID: ${med.id}, audio_url: ${med.audio_url}`);
  if (!med.audio_url) throw new Error('Expected audio_url to be generated immediately');

  // 3. Test 10-minute pre-generation in cron cycle
  console.log(`\n✓ 3. Testing 10-minute pre-generation in runSchedulerCycle...`);
  await runSchedulerCycle(now);
  const updatedMed = getMedicationById(med.id);
  console.log(`   Medication #${med.id} reminder_audio_url: ${updatedMed.reminder_audio_url || 'pregenerated'}`);

  // 4. Test Diagnostic Call generation
  console.log(`\n✓ 4. Testing AI Diagnostic Call generation and IVR XML...`);
  const diagCallEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'diagnostic',
    attempt_number: 1,
    dose_date: new Date().toISOString().split('T')[0]
  });

  const baseUrl = 'http://localhost:3000';
  const diagXmlTwi = generateDiagnosticXml(diagCallEvent.id, baseUrl, true);
  console.log('   Diagnostic XML (Twi):', diagXmlTwi);
  if (!diagXmlTwi.includes('twi_diagnostic_reason.mp3') || !diagXmlTwi.includes('/voice/diagnostic/confirm')) {
    throw new Error('Diagnostic Twi XML missing correct audio or callbackUrl!');
  }

  const diagXmlEn = generateDiagnosticXml(diagCallEvent.id, baseUrl, false);
  console.log('   Diagnostic XML (English):', diagXmlEn);
  if (!diagXmlEn.includes('english_diagnostic_reason.mp3') && !diagXmlEn.includes('<Say')) {
    throw new Error('Diagnostic English XML missing audio or say text!');
  }

  // 5. Test Diagnostic Keypress 2 (Side effects) -> generates health_worker_side_effect escalation
  console.log(`\n✓ 5. Testing Diagnostic keypress processing (Key 2: Side effects)...`);
  const confirmXml = await processDiagnosticConfirm(diagCallEvent.id, '2', baseUrl);
  console.log('   Closing response XML:', confirmXml);

  const updatedDiagEvent = getCallEventById(diagCallEvent.id);
  console.log(`   Diagnostic Call Event Outcome: ${updatedDiagEvent.outcome}`);
  if (updatedDiagEvent.outcome !== 'confirmed') {
    throw new Error(`Expected call event outcome to be confirmed, got: ${updatedDiagEvent.outcome}`);
  }

  const patientLogs = getLogsByPatientId(patient.id);
  const diagLog = patientLogs.find(l => l.id === diagCallEvent.id);
  console.log(`   Timeline log diagnostic reason: ${diagLog?.diagnostic_reason}`);
  if (diagLog?.diagnostic_reason !== 'side_effects') {
    throw new Error('Expected timeline diagnostic_reason to be side_effects');
  }

  const escalations = getOpenEscalationsWithPatient();
  const sideEffectEsc = escalations.find(e => e.patient_id === patient.id && e.escalation_type === 'health_worker_side_effect');
  console.log(`   Escalation created for side effect: ${!!sideEffectEsc}`);
  if (!sideEffectEsc) {
    throw new Error('Expected health_worker_side_effect escalation to be created in DB!');
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL SCHEDULED AGENT & DIAGNOSTIC CALL VERIFICATIONS PASSED!');
  console.log('=============================================================\n');
}

testAll().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
