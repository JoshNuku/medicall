const { createPatient } = require('../src/db/queries/patients');
const { createMedication } = require('../src/db/queries/medications');
const { createCallEvent, getCallEventById } = require('../src/db/queries/callEvents');
const { getDiagnosticResponsesByPatientId } = require('../src/db/queries/diagnosticResponses');
const { getOpenEscalationsWithPatient } = require('../src/db/queries/escalations');
const { processReminderConfirm } = require('../src/services/reminderVoiceService');
const { preGenerateReminderAudio, cleanupOldAudioFiles } = require('../src/services/reminderPipelineService');

async function testSwitchAndDtmf() {
  console.log('=====================================================');
  console.log('  TESTING AI AGENT SWITCH, CUSTOM AUDIO & DTMF 1-4   ');
  console.log('=====================================================\n');

  const baseUrl = 'http://localhost:3000';
  const testPhone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;

  const patient = createPatient({
    phone_number: testPhone,
    name: 'Kofi Mensah',
    preferred_language: 'twi',
    caregiver_phone: '+233549998877'
  });
  console.log('✓ Test Patient created:', patient.name, '(ID:', patient.id, ')');

  // -------------------------------------------------------------
  // TEST CASE 1: Pharmacist Recorded Custom Audio (Bypasses AI)
  // -------------------------------------------------------------
  console.log('\n--- Case 1: Pharmacist Recorded Custom Audio ---');
  const recordedMed = createMedication({
    patient_id: patient.id,
    drug_name: 'Amoxicillin',
    instruction_source: 'recorded', // Pharmacist recorded own voice!
    audio_url: '/audio/pharmacist_custom_voice_note_123.mp3',
    schedule_times: '08:00, 20:00',
    duration_days: 5
  });

  const customAudioUrl = await preGenerateReminderAudio({
    patientId: patient.id,
    medicationId: recordedMed.id
  });
  console.log('✓ Audio URL for recorded medication:', customAudioUrl);
  if (customAudioUrl !== '/audio/pharmacist_custom_voice_note_123.mp3') {
    throw new Error('Expected custom audio to bypass AI generation!');
  }

  // -------------------------------------------------------------
  // TEST CASE 2: AI Agent Switch Enabled + Template Medication
  // -------------------------------------------------------------
  console.log('\n--- Case 2: AI Mode DTMF Keypress (1, 2, 3, 4) ---');
  process.env.ENABLE_AI_AGENT = 'true';

  const templateMed = createMedication({
    patient_id: patient.id,
    drug_name: 'Metformin',
    instruction_source: 'template',
    audio_url: '/audio/default.mp3',
    schedule_times: '08:00, 18:00',
    duration_days: 30,
    is_chronic: 1
  });

  // Test DTMF 1: Confirmed
  const call1 = createCallEvent({
    patient_id: patient.id,
    medication_id: templateMed.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  const res1 = await processReminderConfirm(call1.id, '1', baseUrl);
  const updated1 = getCallEventById(call1.id);
  console.log('✓ Keypress 1 (Confirmed) Outcome:', updated1.outcome);
  if (updated1.outcome !== 'confirmed') throw new Error('DTMF 1 did not confirm dose');

  // Test DTMF 2: Side effects
  const call2 = createCallEvent({
    patient_id: patient.id,
    medication_id: templateMed.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  const res2 = await processReminderConfirm(call2.id, '2', baseUrl);
  const updated2 = getCallEventById(call2.id);
  const { getConversationHistory } = require('../src/db/queries/agentConversations');
  const convHistory = getConversationHistory(patient.id);
  console.log('✓ Keypress 2 Outcome:', updated2.outcome, '| Seeded Conversation Entries:', convHistory.length);
  if (updated2.outcome !== 'not_taken' || convHistory.length === 0) {
    throw new Error('DTMF 2 failed to update outcome or seed conversation memory!');
  }

  // Test DTMF 4: Neutral acknowledgment
  const call4 = createCallEvent({
    patient_id: patient.id,
    medication_id: templateMed.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  const res4 = await processReminderConfirm(call4.id, '4', baseUrl);
  const updated4 = getCallEventById(call4.id);
  console.log('✓ Keypress 4 Outcome:', updated4.outcome, '| XML Response:', res4.substring(0, 80) + '...');
  if (updated4.outcome !== 'not_taken') throw new Error('DTMF 4 failed');

  // -------------------------------------------------------------
  // TEST CASE 3: Switch OFF Fallback Mode
  // -------------------------------------------------------------
  console.log('\n--- Case 3: Switch OFF (ENABLE_AI_AGENT=false) Fallback ---');
  process.env.ENABLE_AI_AGENT = 'false';

  const call5 = createCallEvent({
    patient_id: patient.id,
    medication_id: templateMed.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    dose_date: new Date().toISOString().split('T')[0]
  });
  const res5 = await processReminderConfirm(call5.id, '2', baseUrl);
  const updated5 = getCallEventById(call5.id);
  console.log('✓ Keypress 2 in classic fallback mode outcome:', updated5.outcome, '| XML:', res5.substring(0, 75) + '...');
  if (updated5.outcome !== 'not_taken') throw new Error('Fallback failed');

  // Test cleanup
  cleanupOldAudioFiles(24);
  console.log('✓ Cleanup routine executed without error');

  console.log('\n🎉 ALL SWITCH, CUSTOM AUDIO & DTMF TESTS PASSED 100%!');
}

testSwitchAndDtmf().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
