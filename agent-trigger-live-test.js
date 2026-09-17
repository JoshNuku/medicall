require('dotenv').config();
const { createPatient, getPatientByPhoneNumber } = require('./src/db/queries/patients');
const { createMedication, updateMedicationSchedule } = require('./src/db/queries/medications');
const { createCallEvent } = require('./src/db/queries/callEvents');
const { createDiagnosticResponse } = require('./src/db/queries/diagnosticResponses');
const { preGenerateReminderAudio } = require('./src/services/reminderPipelineService');
const { makeOutboundCall } = require('./src/services/africasTalkingService');

async function triggerLiveTestCall() {
  console.log('=====================================================');
  console.log('       MEDICALL AI AGENT - LIVE CALL TRIGGER         ');
  console.log('=====================================================\n');

  const testPhone = process.argv[2] || process.env.TEST_PHONE || '+233540001122';
  const targetLang = (process.argv[3] || 'english').toLowerCase();
  const testName = 'Pius Oblie';
  const testDrug = 'Paracetamol';

  console.log(`[1] Setting up Patient: ${testName} (${testPhone}) with Preferred Language: [${targetLang.toUpperCase()}]...`);
  let patient = getPatientByPhoneNumber(testPhone);
  const db = require('./src/db/connection');
  if (!patient) {
    patient = createPatient({
      phone_number: testPhone,
      name: testName,
      preferred_language: targetLang,
      caregiver_phone: '+233541112233'
    });
  } else {
    db.prepare('UPDATE patients SET preferred_language = ? WHERE id = ?').run(targetLang, patient.id);
    patient.preferred_language = targetLang;
  }
  console.log(`✓ Patient Ready (ID: ${patient.id}, Language: ${patient.preferred_language})`);

  console.log(`\n[2] Setting up Medication Regimen: ${testDrug}...`);
  const med = createMedication({
    patient_id: patient.id,
    drug_name: testDrug,
    instruction_source: 'template',
    audio_url: '/audio/default-reminder.mp3',
    schedule_times: '08:00, 14:00, 20:00',
    duration_days: 7,
    is_chronic: 0
  });
  console.log(`✓ Medication Ready (ID: ${med.id})`);

  console.log(`\n[3] Seeding Past History (1 missed dose yesterday with reason "forgot")...`);
  const pastCall = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    call_type: 'reminder',
    outcome: 'not_taken',
    dose_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  createDiagnosticResponse({
    call_event_id: pastCall.id,
    patient_id: patient.id,
    reason: 'forgot'
  });
  console.log('✓ Past history context seeded.');

  console.log(`\n[4] Running AI Pipeline (Target Language: ${targetLang.toUpperCase()})...`);
  console.time('AI Pipeline Duration');
  const genResult = await preGenerateReminderAudio({
    patientId: patient.id,
    medicationId: med.id,
    speakerId: 'female'
  });
  console.timeEnd('AI Pipeline Duration');

  if (genResult && typeof genResult === 'object' && genResult.isEnglish) {
    console.log(`✓ English Voice Prompt Generated: "${genResult.text}"`);
    console.log(`✓ Telephony Engine will deliver via high-fidelity real-time <Say> engine.`);
  } else {
    const audioUrl = typeof genResult === 'string' ? genResult : genResult?.audioUrl;
    console.log(`✓ Generated Twi Audio URL: ${audioUrl}`);
    db.prepare('UPDATE medications SET audio_url = ? WHERE id = ?').run(audioUrl, med.id);
  }

  console.log(`\n[5] Creating Call Event & Triggering Africa's Talking Outbound Call...`);
  const callEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: new Date().toISOString(),
    call_type: 'reminder',
    attempt_number: 1,
    dose_date: new Date().toISOString().split('T')[0]
  });
  console.log(`✓ Call Event ID: ${callEvent.id}`);

  console.log(`\n📞 Dialing ${testPhone} from ${process.env.AT_VOICE_PHONE_NUMBER}...`);
  const callResult = await makeOutboundCall(testPhone);
  console.log('✓ Africa\'s Talking Call Response:', JSON.stringify(callResult, null, 2));

  console.log('\n=====================================================');
  console.log('Call dispatched! When your phone rings:');
  console.log(` - Answer the call to hear the ${targetLang.toUpperCase()} reminder.`);
  console.log(' - Keypad Options:');
  console.log('     1 -> Confirm Dose Taken');
  console.log('     2 -> Report Side Effects (Alerts Pharmacist via SMS)');
  console.log('     3 -> Report Cost Issue (Alerts Pharmacist via SMS)');
  console.log('     4 -> Report Forgot (Auto-adapts schedule +10m earlier)');
  console.log('=====================================================\n');
}

triggerLiveTestCall().catch(err => {
  console.error('Error triggering live call:', err);
  process.exit(1);
});
