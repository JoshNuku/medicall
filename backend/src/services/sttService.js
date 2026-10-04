require('dotenv').config();
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;
const KHAYA_ASR_URL = 'https://translation-api.ghananlp.org/asr/v3/transcribe';

/**
 * Transcribes Asante Twi audio using native Khaya ASR v3 API (Ghana NLP)
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} Clean Twi transcript
 */
const transcribeWithKhaya = async (filePath) => {
  if (!KHAYA_API_KEY) {
    throw new Error('KHAYA_API_KEY is not configured in .env');
  }

  const audioBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'audio/mpeg';
  if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.webm') contentType = 'audio/webm';
  else if (ext === '.ogg') contentType = 'audio/ogg';

  const url = `${KHAYA_ASR_URL}?language=twi`;

  console.log(`🎙️ [Khaya ASR v3]: Sending ${audioBuffer.length} bytes to Khaya ASR (${contentType})...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      'x-api-key': KHAYA_API_KEY
    },
    body: audioBuffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Khaya ASR v3 Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
};

/**
 * Transcribes English audio using Groq Whisper API (whisper-large-v3-turbo)
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Optional settings
 * @returns {Promise<string>} Clean English transcript
 */
const transcribeWithGroq = async (filePath, options = {}) => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in .env');
  }

  const fileBlob = await fs.openAsBlob(filePath);
  const fileName = path.basename(filePath) || 'audio.mp3';

  const formData = new FormData();
  formData.append('file', fileBlob, fileName);
  formData.append('model', options.model || 'whisper-large-v3-turbo');

  if (options.language) {
    formData.append('language', options.language);
  }

  const defaultPrompt = 'Prescription dictation: drug names, dosage, frequency, times, Ghanaian patient names and phone numbers.';
  formData.append('prompt', options.prompt || defaultPrompt);

  const response = await fetch(GROQ_STT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper STT Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
};

/**
 * Main transcription router: Dispatches to Khaya ASR for Twi, Groq Whisper for English
 * @param {string} filePath - Absolute or relative path to the audio file
 * @param {Object} options - Options (language: 'twi' | 'en')
 * @returns {Promise<string>} Clean text transcript
 */
const transcribeAudio = async (filePath, options = {}) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const lang = (options.language || 'en').toLowerCase();
  const isTwi = lang === 'twi' || lang === 'tw' || lang === 'asante';

  if (isTwi) {
    console.log('🇬🇭 [STT Router]: Routing audio to Khaya ASR v3 (Asante Twi)...');
    try {
      const transcript = await transcribeWithKhaya(filePath);
      return transcript;
    } catch (khayaErr) {
      console.warn('⚠️ [Khaya ASR Warning]:', khayaErr.message, 'Falling back to Whisper...');
      const fallbackOptions = { ...options };
      delete fallbackOptions.language;
      return transcribeWithGroq(filePath, fallbackOptions);
    }
  }

  console.log('🇬🇧 [STT Router]: Routing audio to Groq Whisper Large v3 Turbo (English)...');
  return transcribeWithGroq(filePath, { language: 'en', ...options });
};

module.exports = {
  transcribeAudio,
  transcribeWithKhaya,
  transcribeWithGroq
};
