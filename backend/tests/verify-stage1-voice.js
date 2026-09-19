const { createPatient } = require('../src/db/queries/patients');
const { createMedication } = require('../src/db/queries/medications');
const { createCallEvent, getCallEventById } = require('../src/db/queries/callEvents');
const { getOpenEscalationsWithPatient } = require('../src/db/queries/escalations');
const { generateReminderXml, processReminderConfirm } = require('../src/services/reminderVoiceService');

async function runTests() {
  console.log('--- Starting Stage 1 & Voice Verification ---');

  // 1. Create a test patient with fake data as required by safety guidelines
  const randomPhone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;
  const patient = createPatient({
    phone_number: randomPhone,
    name: 'Kofi Mensah',
    preferred_language: 'twi',
    caregiver_phone: '+233000000002'
  });
  console.log('✓ Created test patient ID:', patient.id);

  // 2. Create a test medication for the patient
  const medication = createMedication({
    patient_id: patient.id,
    drug_name: 'Amoxicillin 500mg',
    instruction_source: 'template',
    dosage_template_id: 1,
    frequency_template_id: 9,
    timing_template_id: 14,
    audio_url: 'http://localhost:3000/audio/amoxicillin-twi.mp3',
    schedule_times: '08:00,14:00,20:00',
    duration_days: 7,
    is_chronic: 0
  });
  console.log('✓ Created test medication ID:', medication.id);

  // 3. Create a call_event record
  const callEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: medication.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  console.log('✓ Created call_event ID:', callEvent.id);

  // 4. Test generateReminderXml (outbound call webhook)
  const baseUrl = 'http://localhost:3000';
  const reminderXml = generateReminderXml(callEvent.id, medication.audio_url, baseUrl);
  console.log('✓ Reminder XML output:\n', reminderXml);
  if (!reminderXml.includes('<GetDigits') || !reminderXml.includes('<Play')) {
    throw new Error('Reminder XML missing GetDigits or Play tags!');
  }

  // 5. Test keypress 1 (confirmed)
  const confirmXml = processReminderConfirm(callEvent.id, '1', baseUrl);
  const updatedEvent1 = getCallEventById(callEvent.id);
  console.log('✓ Keypress 1 outcome:', updatedEvent1.outcome);
  if (updatedEvent1.outcome !== 'confirmed') throw new Error('Expected outcome to be confirmed');

  // 6. Test keypress 2 (not_taken)
  const callEvent2 = createCallEvent({
    patient_id: patient.id,
    medication_id: medication.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  processReminderConfirm(callEvent2.id, '2', baseUrl);
  const updatedEvent2 = getCallEventById(callEvent2.id);
  console.log('✓ Keypress 2 outcome:', updatedEvent2.outcome);
  if (updatedEvent2.outcome !== 'not_taken') throw new Error('Expected outcome to be not_taken');

  // 7. Test keypress 9 (repeat universal key)
  const repeatXml = processReminderConfirm(callEvent.id, '9', baseUrl);
  console.log('✓ Keypress 9 (repeat) returned re-prompt XML:', repeatXml.includes('<GetDigits'));

  // 8. Test keypress 0 (request help universal key)
  const helpXml = processReminderConfirm(callEvent.id, '0', baseUrl);
  console.log('✓ Keypress 0 (help) XML message:', helpXml.includes('healthcare worker has been notified'));
  const escalations = getOpenEscalationsWithPatient();
  const helpEscalation = escalations.find(e => e.escalation_type === 'patient_requested_help');
  console.log('✓ Escalation logged for help keypress:', !!helpEscalation);
  if (!helpEscalation) throw new Error('Expected patient_requested_help escalation');

  console.log('\nAll test assertions passed successfully!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
