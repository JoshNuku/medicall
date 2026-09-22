const fs = require('fs');
const path = require('path');
const { generateReminderMessage } = require('./agent');
const { translateEnglishToTwi, synthesizeTwiSpeech } = require('./khayaService');
const { getPatientById } = require('../db/queries/patients');
const { getMedicationById } = require('../db/queries/medications');

/**
 * Pre-generates the personalized AI audio file before a scheduled call.
 * Bypasses AI if pharmacist recorded custom audio or if ENABLE_AI_AGENT is false.
 */
const preGenerateReminderAudio = async ({ patientId, medicationId, speakerId = 'female' }) => {
  const isAiEnabled = process.env.ENABLE_AI_AGENT === 'true';
  const medication = getMedicationById(medicationId);

  if (!medication) return null;

  // 1. If pharmacist uploaded a recorded voice note -> NEVER route to agent
  if (medication.instruction_source === 'recorded') {
    return medication.audio_url;
  }

  // 2. If AI agent is switched off in .env -> fallback to static template
  if (!isAiEnabled) {
    return medication.audio_url || '/audio/default-reminder.mp3';
  }

  // 3. AI Agent dynamic generation (English -> Twi -> Neural TTS)
  try {
    const patient = getPatientById(patientId);
    const lang = (patient ? patient.preferred_language : 'twi').toLowerCase();

    // Step A: Groq LLM generates English text with context
    console.log(`   [Step 1/3] 🧠 Groq AI Agent generating personalized reminder...`);
    const englishRaw = await generateReminderMessage({ patientId, medicationId });
    if (!englishRaw) return medication.audio_url;

    // Normalize any digits to full spoken words for smooth Khaya AI translation & pronunciation
    const englishText = englishRaw
      .replace(/\b500mg\b/gi, 'five hundred milligrams')
      .replace(/\b250mg\b/gi, 'two hundred and fifty milligrams')
      .replace(/\b1000mg\b/gi, 'one thousand milligrams')
      .replace(/\b1\s*tablet\b/gi, 'one tablet')
      .replace(/\b2\s*tablets\b/gi, 'two tablets')
      .replace(/\b1\s*capsule\b/gi, 'one capsule')
      .replace(/\b2\s*capsules\b/gi, 'two capsules')
      .replace(/\b1\b/g, 'one')
      .replace(/\b2\b/g, 'two')
      .replace(/\b3\b/g, 'three')
      .replace(/\b4\b/g, 'four')
      .replace(/\b5\b/g, 'five')
      .replace(/press one/gi, 'press number one')
      .replace(/press two/gi, 'press number two')
      .replace(/press three/gi, 'press number three')
      .replace(/press four/gi, 'press number four');

    console.log(`   ✓ Agent Generated English:\n     "${englishText}"`);

    // Step B: If English -> No Khaya needed! Return null audio so Africa's Talking speaks English via <Say>
    if (lang === 'english' || lang === 'en') {
      console.log(`   ✓ Telephony Mode: Real-time <Say> TTS engine (0 latency).`);
      return { isEnglish: true, text: englishText };
    }

    // Step C: If Twi -> Translate to Twi and synthesize via Khaya AI Neural TTS
    console.log(`   [Step 2/3] 🌐 Translating English to Asante Twi via Khaya AI NLP...`);
    const translated = await translateEnglishToTwi(englishText);
    const finalTwiText = translated || englishText;
    console.log(`   ✓ Twi Translation:\n     "${finalTwiText}"`);

    console.log(`   [Step 3/3] 🎙️ Synthesizing Twi Speech via Khaya Neural TTS...`);
    const filename = `reminder_patient_${patientId}_med_${medicationId}_${Date.now()}.mp3`;
    const audioUrl = await synthesizeTwiSpeech(finalTwiText, filename, speakerId);
    console.log(`   ✓ Audio file ready: ${audioUrl}`);

    return audioUrl || medication.audio_url;
  } catch (err) {
    console.error('[Reminder Pre-Generation Error]:', err.message);
    return medication.audio_url || '/audio/default-reminder.mp3';
  }
};

/**
 * Periodically deletes temporary AI audio files older than maxAgeHours (default 24h).
 */
const cleanupOldAudioFiles = (maxAgeHours = 24) => {
  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) return;

  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(audioDir);
    for (const file of files) {
      if (file.startsWith('reminder_patient_') || file.startsWith('khaya_')) {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`[Audio Cleanup] Removed expired reminder audio: ${file}`);
        }
      }
    }
  } catch (err) {
    console.error('[Audio Cleanup Error]:', err.message);
  }
};

module.exports = {
  preGenerateReminderAudio,
  cleanupOldAudioFiles
};
