require('dotenv').config();
const path = require('path');
const { createPatient, getPatientByPhoneNumber } = require('./src/db/queries/patients');
const { createMedication, getMedicationsByPatientId } = require('./src/db/queries/medications');
const { createCallEvent } = require('./src/db/queries/callEvents');
const { createDiagnosticResponse } = require('./src/db/queries/diagnosticResponses');
const { generateReminderMessage } = require('./src/services/agent');
const { translateEnglishToTwi, synthesizeTwiSpeech } = require('./src/services/khayaService');

async function runAgentTest() {
  console.log('==============================================');
  console.log('       MEDICALL AGENT TEST (PHASE 1)          ');
  console.log('==============================================\n');

  // 1. Seed or find test patient: Pius Oblie
  const testPhone = '+233540001122';
  let patient = getPatientByPhoneNumber(testPhone);
  if (!patient) {
    patient = createPatient({
      phone_number: testPhone,
      name: 'Pius Oblie',
      preferred_language: 'twi',
      caregiver_phone: '+233549998877'
    });
  }
  console.log(`[1] Patient Context Loaded: ${patient.name} (${patient.phone_number})`);

  // 2. Seed Medication: Paracetamol
  let meds = getMedicationsByPatientId(patient.id);
  let med = meds[0];
  if (!med) {
    med = createMedication({
      patient_id: patient.id,
      drug_name: 'Paracetamol',
      instruction_source: 'template',
      audio_url: '/audio/paracetamol_twi.mp3',
      schedule_times: '08:00, 14:00, 20:00',
      duration_days: 7,
      is_chronic: 0
    });
  }
  console.log(`[2] Medication Regimen: ${med.drug_name} at ${med.schedule_times}`);

  // 3. Seed yesterday's missed dose and reason 'forgot'
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const callEvent = createCallEvent({
    patient_id: patient.id,
    medication_id: med.id,
    scheduled_time: yesterday.toISOString(),
    call_type: 'reminder',
    outcome: 'not_taken',
    dose_date: yesterdayStr
  });

  createDiagnosticResponse({
    call_event_id: callEvent.id,
    patient_id: patient.id,
    reason: 'forgot'
  });
  console.log(`[3] Seeded Past History: Missed yesterday (${yesterdayStr}) -> Reason: "forgot"\n`);

  // 4. Trigger Phase 1 Agent: Pure spoken text generation in English
  console.log('Calling Groq LLM Agent (Phase 1: Generate English Text)...');
  console.log('Model:', process.env.GROQ_MODEL || 'gpt-oss-120B');
  console.log('----------------------------------------------');

  const generatedEnglish = await generateReminderMessage({
    patientId: patient.id,
    medicationId: med.id
  });

  console.log('\n🎙️ [ENGLISH REMINDER TEXT]:');
  console.log('----------------------------------------------');
  console.log(generatedEnglish || '(No response returned)');
  console.log('----------------------------------------------\n');

  // 5. Translate English Text to Twi via Khaya AI
  if (generatedEnglish) {
    console.log('Translating to Twi via Khaya AI Translation API...');
    const twiTranslation = await translateEnglishToTwi(generatedEnglish);

    console.log('\n🇬🇭 [TWI TRANSLATION OUTPUT]:');
    console.log('----------------------------------------------');
    console.log(twiTranslation || '(Translation failed - verify KHAYA_API_KEY in .env)');
    console.log('----------------------------------------------\n');

    // 6. Synthesize Twi speech into MP3 audio via Khaya TTS API v2
    if (twiTranslation) {
      console.log('Synthesizing Twi Speech via Khaya AI TTS API (speaker: female)...');
      const audioUrl = await synthesizeTwiSpeech(twiTranslation, `reminder_pius_${Date.now()}.mp3`, 'female');

      console.log('\n🔊 [GENERATED AUDIO FILE]:');
      console.log('----------------------------------------------');
      if (audioUrl) {
        const fullDiskPath = path.join(__dirname, 'public', audioUrl.replace('/audio/', 'audio/'));
        console.log(`Audio Relative URL: ${audioUrl}`);
        console.log(`Saved On Disk:     ${fullDiskPath}`);
      } else {
        console.log('(TTS generation failed - check Khaya API Key / endpoint)');
      }
      console.log('----------------------------------------------\n');
    }
  }
}

runAgentTest().catch(err => {
  console.error('Agent test failed with error:', err.message);
});
