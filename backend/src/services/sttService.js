require('dotenv').config();
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;
const KHAYA_ASR_URL = 'https://translation-api.ghananlp.org/asr/v3/transcribe';
const LAB_ASR_URL = process.env.LAB_ASR_URL || 'https://lab-subscription-platform.vercel.app/api/v1/asr';

// Active ASR Engine Provider: 'groq' or 'lab'
let currentAsrProvider = (process.env.ASR_PROVIDER || 'groq').toLowerCase().trim();
if (!['groq', 'lab'].includes(currentAsrProvider)) {
  currentAsrProvider = 'groq';
}

function getActiveAsrProvider() {
  return currentAsrProvider;
}

function setActiveAsrProvider(provider) {
  const normalized = (provider || '').toLowerCase().trim();
  if (['groq', 'lab'].includes(normalized)) {
    currentAsrProvider = normalized;
    process.env.ASR_PROVIDER = normalized;
    console.log(`🎙️ [ASR Service] Switched active ASR provider to: "${currentAsrProvider.toUpperCase()}"`);
    return currentAsrProvider;
  }
  throw new Error(`Invalid ASR provider: "${provider}". Expected "groq" or "lab".`);
}

function getAsrProvidersStatus() {
  const groqConfigured = Boolean(process.env.GROQ_API_KEY);
  const labConfigured = Boolean(process.env.LAB_ASR_API_KEY || process.env.TTS_API_KEY);

  return {
    activeProvider: currentAsrProvider,
    availableProviders: ['groq', 'lab'],
    providers: {
      groq: {
        name: 'Groq Whisper Large v3 Turbo',
        model: 'whisper-large-v3-turbo',
        configured: groqConfigured,
        description: 'Ultra-fast cloud speech recognition for English prescriptions, clinical terminology, and multilingual dictations.'
      },
      lab: {
        name: 'Lab Subscription Platform ASR',
        model: 'Akan / Twi Speech-to-Text',
        configured: labConfigured,
        description: 'Native Ghanaian speech-to-text neural engine optimized for local Akan, Twi dialects, and patient names.'
      }
    }
  };
}

/**
 * Transcribes audio using Lab Subscription Platform ASR (/api/v1/asr)
 * @param {string} filePath - Path to audio file
 * @returns {Promise<string>} Clean transcript
 */
const transcribeWithLab = async (filePath) => {
  const apiKey = process.env.LAB_ASR_API_KEY || process.env.TTS_API_KEY;
  if (!apiKey) {
    throw new Error('Lab ASR API key (LAB_ASR_API_KEY or TTS_API_KEY) is not configured in .env');
  }

  const fileBlob = await fs.openAsBlob(filePath);
  const fileName = path.basename(filePath) || 'audio.mp3';

  const formData = new FormData();
  formData.append('file', fileBlob, fileName);

  console.log(`🎙️ [Lab ASR]: Uploading ${fileName} to Lab ASR platform (${LAB_ASR_URL})...`);

  const response = await fetch(LAB_ASR_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lab ASR Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const transcript = data.transcription || data.transcript || data.text || '';
  console.log(`✓ [Lab ASR]: Received transcript: "${transcript}"`);
  return transcript;
};

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
  else if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';

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
 * Transcribes audio using Groq Whisper API (whisper-large-v3-turbo)
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Optional settings
 * @returns {Promise<string>} Clean transcript
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
 * Main transcription router: Dispatches based on active ASR provider or explicit options
 * @param {string} filePath - Absolute or relative path to the audio file
 * @param {Object} options - Options (language: 'twi' | 'en', provider: 'groq' | 'lab')
 * @returns {Promise<string>} Clean text transcript
 */
const transcribeAudio = async (filePath, options = {}) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const provider = (options.provider || getActiveAsrProvider()).toLowerCase();
  const lang = (options.language || 'en').toLowerCase();
  const isTwi = lang === 'twi' || lang === 'tw' || lang === 'asante';

  if (provider === 'lab') {
    console.log(`🎙️ [STT Router]: Routing audio to Lab Subscription Platform ASR...`);
    try {
      const labTranscript = await transcribeWithLab(filePath);
      if (labTranscript && labTranscript.trim()) {
        return labTranscript;
      }
    } catch (labErr) {
      console.warn('⚠️ [Lab ASR Warning]:', labErr.message, 'Falling back to Groq Whisper...');
    }
    return await transcribeWithGroq(filePath, options);
  }

  // Provider is 'groq'
  if (isTwi && KHAYA_API_KEY) {
    console.log('🇬🇭 [STT Router]: Routing audio to Khaya ASR v3 (Asante Twi)...');
    try {
      const khayaTranscript = await transcribeWithKhaya(filePath);
      if (khayaTranscript && khayaTranscript.trim()) {
        return khayaTranscript;
      }
    } catch (khayaErr) {
      console.warn('⚠️ [Khaya ASR Warning]:', khayaErr.message, 'Falling back to Groq Whisper...');
    }
  }

  console.log('⚡ [STT Router]: Routing audio to Groq Whisper Large v3 Turbo...');
  return await transcribeWithGroq(filePath, { language: isTwi ? undefined : 'en', ...options });
};

module.exports = {
  transcribeAudio,
  transcribeWithLab,
  transcribeWithGroq,
  transcribeWithKhaya,
  getActiveAsrProvider,
  setActiveAsrProvider,
  getAsrProvidersStatus
};
