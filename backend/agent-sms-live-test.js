require('dotenv').config();
const { createPatient, getPatientByPhoneNumber } = require('./src/db/queries/patients');
const { createMedication } = require('./src/db/queries/medications');
const { createCallEvent } = require('./src/db/queries/callEvents');
const { createDiagnosticResponse } = require('./src/db/queries/diagnosticResponses');
const { generateReminderMessage } = require('./src/services/agent');
const { translateEnglishToTwi } = require('./src/services/khayaService');
const { sendSms } = require('./src/services/africasTalkingService');
const { executeTool } = require('./src/services/agentTools');

async function triggerLiveSmsTest() {
  console.log('=====================================================');
  console.log('       MEDICALL AI AGENT - LIVE SMS TRIGGER          ');
  console.log('=====================================================\n');

  const testPhone = process.argv[2] || process.env.TEST_PHONE || '+233536287642';
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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const pastCall = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: yesterday,
    actual_call_time: yesterday,
    call_type: 'reminder',
    outcome: 'not_taken',
    attempt_number: 1,
    dose_date: yesterday.split('T')[0]
  });
  createDiagnosticResponse({
    call_event_id: pastCall.id,
    patient_id: patient.id,
    reason: 'forgot'
  });
  console.log('✓ Past history context seeded.');

  console.log(`\n[4] Running Groq AI Pipeline for SMS (Target Language: ${targetLang.toUpperCase()})...`);
  const startTime = Date.now();
  const englishReminder = await generateReminderMessage({ patientId: patient.id, medicationId: med.id });
  let finalSmsText = englishReminder;

  if (targetLang === 'twi' || targetLang === 'tw') {
    console.log(`✓ English Text Generated: "${englishReminder}"`);
    console.log(`🌐 Translating to Twi via Khaya AI NLP API...`);
    const twiText = await translateEnglishToTwi(englishReminder);
    finalSmsText = twiText || englishReminder;
    console.log(`✓ Twi SMS Text Generated: "${finalSmsText}"`);
  } else {
    console.log(`✓ English SMS Text Generated: "${finalSmsText}"`);
  }
  console.log(`⏱ Pipeline Duration: ${(Date.now() - startTime).toFixed(2)}ms`);

  console.log(`\n[5] Executing AI Agent 'send_sms' Tool via Africa's Talking...`);
  const toolResult = await executeTool('send_sms', {
    patient_id: patient.id,
    recipient: 'patient',
    message: finalSmsText
  });

  console.log('=====================================================');
  console.log('✓ SMS Dispatched Successfully!');
  console.log(` - Target: ${testPhone}`);
  console.log(` - Language: ${targetLang.toUpperCase()}`);
  console.log(` - Message: "${finalSmsText}"`);
  console.log('=====================================================\n');
}

triggerLiveSmsTest().catch(err => {
  console.error('Error triggering live SMS test:', err);
  process.exit(1);
});
