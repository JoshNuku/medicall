const fs = require('fs');
const path = require('path');
const { generateReminderMessage, generateDiagnosticMessage } = require('./agent');
const { translateEnglishToTwi, synthesizeTwiSpeech } = require('./khayaService');
const { getPatientById } = require('../db/queries/patients');
const { getMedicationById } = require('../db/queries/medications');

/**
 * Pre-generates the personalized AI audio file before a scheduled call.
 * Bypasses AI if pharmacist recorded custom audio or if ENABLE_AI_AGENT is false.
 */
const preGenerateReminderAudio = async ({ patientId, medicationId, speakerId = 'female' }) => {
  const isAiEnabled = process.env.ENABLE_AI_AGENT === 'true';
  const medication = await getMedicationById(medicationId);

  if (!medication) return null;

  // 1. If pharmacist uploaded a recorded voice note -> NEVER route to agent
  if (medication.instruction_source === 'recorded') {
    return medication.audio_url;
  }

  // 2. If AI agent is switched off in .env -> fallback to static reminder template
  if (!isAiEnabled) {
    return medication.reminder_audio_url || '/audio/default-reminder.mp3';
  }

  // 3. AI Agent dynamic generation (English -> Twi -> Neural TTS)
  try {
    const patient = await getPatientById(patientId);
    const lang = (patient ? patient.preferred_language : 'twi').toLowerCase();

    // Step A: Groq LLM generates English text with context
    console.log(`   [Step 1/3] 🧠 Groq AI Agent generating personalized reminder...`);
    const englishRaw = await generateReminderMessage({ patientId, medicationId });
    if (!englishRaw) return medication.reminder_audio_url || '/audio/default-reminder.mp3';

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
      .replace(/\b6\b/g, 'six')
      .replace(/\b9\b/g, 'nine')
      .replace(/press one/gi, 'press number one')
      .replace(/press two/gi, 'press number two')
      .replace(/press three/gi, 'press number three')
      .replace(/press four/gi, 'press number four')
      .replace(/press six/gi, 'press number six')
      .replace(/press nine/gi, 'press number nine');

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

    const resolvedAudio = audioUrl || medication.reminder_audio_url || '/audio/default-reminder.mp3';
    if (audioUrl && typeof audioUrl === 'string') {
      const db = require('../db/connection');
      try {
        await db.query('UPDATE medications SET reminder_audio_url = $1 WHERE id = $2', [audioUrl, medicationId]);
      } catch (_) {}
    }

    return resolvedAudio;
  } catch (err) {
    console.error('[Reminder Pre-Generation Error]:', err.message);
    return medication.reminder_audio_url || '/audio/default-reminder.mp3';
  }
};

/**
 * Immediately generates the full clinical prescription audio when prescribed in template mode.
 * Assembles drug name + dosage + frequency + timing (+ keypress guidance),
 * and synthesizes via Khaya Neural TTS for Twi, or prepares English audio.
 */
const generateFullPrescriptionAudio = async ({ patientId, medicationId, speakerId = 'female' }) => {
  const { getTemplateById } = require('../db/queries/templates');
  const medication = await getMedicationById(medicationId);
  if (!medication) return null;
  if (medication.instruction_source === 'recorded') return medication.audio_url;

  const patient = await getPatientById(patientId);
  const lang = (medication.language || (patient ? patient.preferred_language : 'twi')).toLowerCase();
  const isEnglish = lang === 'english' || lang === 'en';

  const dosage = medication.dosage_template_id ? await getTemplateById(medication.dosage_template_id) : null;
  const freq = medication.frequency_template_id ? await getTemplateById(medication.frequency_template_id) : null;
  const timing = medication.timing_template_id ? await getTemplateById(medication.timing_template_id) : null;

  if (isEnglish) {
    const drugLower = (medication.drug_name || '').toLowerCase();
    if (drugLower.includes('lisinopril')) return '/audio/lisinopril_en.mp3';
    if (drugLower.includes('metformin')) return '/audio/metformin_en.mp3';
    return '/audio/default-reminder-en.mp3';
  }

  // Asante Twi full prescription
  const twiPhrases = [
    dosage ? dosage.text_twi : '',
    freq ? freq.text_twi : '',
    timing ? timing.text_twi : ''
  ].filter(Boolean);

  const assembledTwiText = `Fa wo nnuro ${medication.drug_name}. ${twiPhrases.join('. ')}. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.`;

  try {
    console.log(`🎙️ [PRESCRIPTION SYNTHESIS]: Generating full prescription audio via Khaya TTS...`);
    console.log(`   Text: "${assembledTwiText}"`);
    const filename = `prescription_patient_${patientId}_med_${medicationId}_${Date.now()}.mp3`;
    const audioUrl = await synthesizeTwiSpeech(assembledTwiText, filename, speakerId);
    if (audioUrl) {
      console.log(`✓ Full prescription audio ready: ${audioUrl}`);
      const db = require('../db/connection');
      try {
        await db.query('UPDATE medications SET audio_url = $1 WHERE id = $2', [audioUrl, medicationId]);
      } catch (_) {}
      return audioUrl;
    }
  } catch (err) {
    console.error('[Prescription Audio Synthesis Error]:', err.message);
  }

  return (dosage && dosage.audio_url) || '/audio/default-reminder.mp3';
};

/**
 * Synthesizes English speech by chunking into sentence segments to respect Google TTS length limits.
 */
const synthesizeEnglishSpeech = async (text, filename) => {
  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  const finalFilePath = path.join(audioDir, filename);

  try {
    const sentences = text.match(/[^.?!]+[.?!]+|[^.?!]+$/g) || [text];
    const buffers = [];
    for (const s of sentences) {
      const q = s.trim();
      if (!q) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw-ob`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        buffers.push(Buffer.from(await res.arrayBuffer()));
      }
    }
    if (buffers.length > 0) {
      const combined = Buffer.concat(buffers);
      fs.writeFileSync(finalFilePath, combined);

      try {
        const { uploadAudioFile } = require('./cloudinaryService');
        const cloudUrl = await uploadAudioFile(finalFilePath);
        if (cloudUrl) return cloudUrl;
      } catch (cloudErr) {
        console.warn('⚠️ [Cloudinary Upload Warning]:', cloudErr.message);
      }

      return `/audio/${filename}`;
    }
  } catch (err) {
    console.warn('[English TTS Warning]:', err.message);
  }
  return '/audio/english_diagnostic_reason.mp3';
};

/**
 * Pre-generates the personalized AI diagnostic evaluation audio.
 * Formulates empathetic check-in with keypad options,
 * translates & synthesizes to Asante Twi via Khaya AI, or synthesizes English MP3.
 */
const generateDiagnosticAudio = async ({ patientId, medicationId, speakerId = 'female' }) => {
  const isAiEnabled = process.env.ENABLE_AI_AGENT === 'true';
  const patient = await getPatientById(patientId);
  const medication = medicationId ? await getMedicationById(medicationId) : null;
  const lang = (medication?.language || (patient ? patient.preferred_language : 'twi')).toLowerCase();
  const isEnglish = lang === 'english' || lang === 'en';
  const patientName = patient ? patient.name : 'there';
  const drugName = medication ? medication.drug_name : 'your medication';

  try {
    console.log(`   [Step 1/3] 🧠 Groq AI Agent generating diagnostic prompt for ${patientName}...`);
    let englishRaw = null;
    if (isAiEnabled) {
      try {
        englishRaw = await generateDiagnosticMessage({ patientId, medicationId });
      } catch (agentErr) {
        console.warn('   ⚠️ [Agent Diagnostic Error]:', agentErr.message);
      }
    }

    if (!englishRaw) {
      englishRaw = `Hello ${patientName}, this is your MediCall health companion checking in on you regarding your ${drugName}. Why were you unable to take your medication? Press 1 for cost or refill challenges. Press 2 for side effects. Press 3 if you forgot. Press 4 for other reasons. Press 9 to repeat, or press 0 for your pharmacist.`;
    }

    const englishText = englishRaw
      .replace(/\b1\b/g, 'one')
      .replace(/\b2\b/g, 'two')
      .replace(/\b3\b/g, 'three')
      .replace(/\b4\b/g, 'four')
      .replace(/\b9\b/g, 'nine')
      .replace(/\b0\b/g, 'zero')
      .replace(/press one/gi, 'press number one')
      .replace(/press two/gi, 'press number two')
      .replace(/press three/gi, 'press number three')
      .replace(/press four/gi, 'press number four')
      .replace(/press nine/gi, 'press number nine')
      .replace(/press zero/gi, 'press number zero');

    console.log(`   ✓ Diagnostic Prompt in English:\n     "${englishText}"`);

    // For English: synthesize clear MP3 audio so Africa's Talking plays reliable audio (no silent <Say>)
    if (isEnglish) {
      console.log(`   [Step 2/2] 🎙️ Synthesizing English Diagnostic Audio file...`);
      const filename = `diagnostic_patient_${patientId}_${Date.now()}.mp3`;
      const audioUrl = await synthesizeEnglishSpeech(englishText, filename);
      console.log(`   ✓ Diagnostic audio ready: ${audioUrl}`);
      return audioUrl;
    }

    // For Twi: Translate and synthesize via Khaya AI Neural TTS
    console.log(`   [Step 2/3] 🌐 Translating Diagnostic Prompt to Asante Twi via Khaya AI NLP...`);
    const translated = await translateEnglishToTwi(englishText);
    const finalTwiText = translated || `Meda wo akye ${patientName}, yɛfrɛ wo firi MediCall sɛ yɛbɛbisa wo wo ${drugName} nnuro ho asɛm. Adɛn nti na woantumi anom? Mia baako sɛ sika na ɛyɛ den. Mia mmienu sɛ ɛreyɛ wo bɔne. Mia mmiɛnsa sɛ wo werɛ firiie. Mia nnan ma biribi foforɔ. Mia nkron sɛ wopɛ sɛ wotie bio, anaa mia hwee ma wo duruyɛfoɔ.`;
    console.log(`   ✓ Twi Translation:\n     "${finalTwiText}"`);

    console.log(`   [Step 3/3] 🎙️ Synthesizing Asante Twi Speech via Khaya Neural TTS...`);
    const filename = `diagnostic_patient_${patientId}_${Date.now()}.mp3`;
    const audioUrl = await synthesizeTwiSpeech(finalTwiText, filename, speakerId);
    console.log(`   ✓ Diagnostic audio ready: ${audioUrl || '/audio/twi_diagnostic_reason.mp3'}`);
    return audioUrl || '/audio/twi_diagnostic_reason.mp3';
  } catch (err) {
    console.error('[Diagnostic Audio Generation Error]:', err.message);
    return isEnglish ? '/audio/english_diagnostic_reason.mp3' : '/audio/twi_diagnostic_reason.mp3';
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
      if (file.startsWith('reminder_patient_') || file.startsWith('diagnostic_patient_') || file.startsWith('khaya_')) {
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
  generateFullPrescriptionAudio,
  generateDiagnosticAudio,
  cleanupOldAudioFiles
};
