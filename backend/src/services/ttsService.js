const fs = require('fs');
const path = require('path');
const { uploadAudio, isConfigured: isCloudinaryConfigured } = require('./cloudinaryService');
require('dotenv').config();

const TTS_API_URL = process.env.TTS_API_URL || process.env.LAB_TTS_URL || 'https://lab-subscription-platform.vercel.app/api/v1/tts';
const TTS_API_KEY = process.env.TTS_API_KEY || process.env.LAB_TTS_API_KEY;
const KHAYA_TTS_URL = process.env.KHAYA_API_URL || 'https://translation-api.ghananlp.org/tts/v2/synthesize';
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

// Active TTS Engine Provider: 'lab' or 'khaya'
let currentProvider = (process.env.TTS_PROVIDER || 'lab').toLowerCase().trim();
if (!['lab', 'khaya'].includes(currentProvider)) {
  currentProvider = 'lab';
}

function getActiveTtsProvider() {
  return currentProvider;
}

function setActiveTtsProvider(provider) {
  const normalized = (provider || '').toLowerCase().trim();
  if (['lab', 'khaya'].includes(normalized)) {
    currentProvider = normalized;
    process.env.TTS_PROVIDER = normalized;
    console.log(`🎙️ [TTS Service] Switched active TTS engine provider to: "${currentProvider.toUpperCase()}"`);
    return currentProvider;
  }
  throw new Error(`Invalid TTS provider: "${provider}". Expected "lab" or "khaya".`);
}

function getTtsProvidersStatus() {
  const labConfigured = Boolean(process.env.TTS_API_KEY || process.env.LAB_TTS_API_KEY);
  const khayaConfigured = Boolean(process.env.KHAYA_API_KEY);
  return {
    activeProvider: currentProvider,
    availableProviders: ['lab', 'khaya'],
    providers: {
      lab: {
        name: 'Lab Subscription Platform',
        model: 'PT (ss)',
        configured: labConfigured,
        url: TTS_API_URL
      },
      khaya: {
        name: 'Khaya AI (Ghana NLP v2)',
        model: 'Ghanaian Asante Twi Neural',
        configured: khayaConfigured,
        url: KHAYA_TTS_URL
      }
    }
  };
}

let ffmpeg = null;
try {
  ffmpeg = require('fluent-ffmpeg');
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
} catch (e) {
  console.warn('[FFmpeg] fluent-ffmpeg or @ffmpeg-installer not available:', e.message);
}

/**
 * Splits text into chunks of at most maxLength characters (API limit: 250),
 * respecting sentence and word boundaries.
 */
function splitTextIntoChunks(text, maxLength = 240) {
  if (!text || text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxLength) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (trimmed.length <= maxLength) {
        currentChunk = trimmed;
      } else {
        const words = trimmed.split(/\s+/);
        let wordChunk = '';
        for (const word of words) {
          if ((wordChunk + ' ' + word).trim().length <= maxLength) {
            wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        currentChunk = wordChunk;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

/**
 * Makes a single TTS synthesis request to the Lab Subscription Platform.
 */
async function requestLabTtsChunk(text) {
  const apiKey = process.env.TTS_API_KEY || process.env.LAB_TTS_API_KEY;
  if (!apiKey) {
    console.warn('[TTS Lab Service] TTS_API_KEY is not set in .env');
    return null;
  }

  try {
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_type: 'ss',
        speaker: 'PT'
      })
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || contentType.includes('application/json')) {
      let errData = null;
      try {
        errData = await response.json();
      } catch (_) {
        errData = { error: { message: await response.text().catch(() => 'Unknown upstream error') } };
      }

      const errCode = errData?.error?.code || `HTTP_${response.status}`;
      const errMsg = errData?.error?.message || response.statusText;
      const reqId = errData?.request_id || response.headers.get('x-request-id') || 'n/a';

      console.error(`[TTS Lab Error (${response.status})]: ${errCode} - ${errMsg} (Request ID: ${reqId})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[TTS Lab Network Error]:', err.message);
    return null;
  }
}

/**
 * Adjusts audio playback speed (tempo) and converts to target format (e.g. mp3).
 */
function processAudioWithFfmpeg(inputPath, outputPath, tempo = 0.88) {
  if (!ffmpeg) return Promise.resolve(inputPath);

  return new Promise((resolve) => {
    let command = ffmpeg(inputPath);

    if (tempo && tempo !== 1.0) {
      command = command.audioFilters(`atempo=${tempo}`);
    }

    command
      .output(outputPath)
      .on('end', () => {
        try {
          if (fs.existsSync(inputPath) && inputPath !== outputPath) {
            fs.unlinkSync(inputPath);
          }
        } catch (_) {}
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.warn(`[FFmpeg Processing Warning]: ${err.message}. Keeping source audio.`);
        resolve(inputPath);
      })
      .run();
  });
}

/**
 * Concatenates multiple WAV audio files into a single output file using ffmpeg.
 */
function concatAudioFiles(filePaths, outputPath, tempo = 0.88) {
  if (!ffmpeg || filePaths.length === 1) {
    return processAudioWithFfmpeg(filePaths[0], outputPath, tempo);
  }

  return new Promise((resolve) => {
    const command = ffmpeg();
    filePaths.forEach((fp) => command.input(fp));

    let filter = `concat=n=${filePaths.length}:v=0:a=1`;
    if (tempo && tempo !== 1.0) {
      filter += `[a];[a]atempo=${tempo}`;
    }

    command
      .complexFilter(filter)
      .output(outputPath)
      .on('end', () => {
        filePaths.forEach((fp) => {
          try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
        });
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.warn(`[FFmpeg Concat Warning]: ${err.message}. Falling back to first chunk.`);
        resolve(filePaths[0]);
      })
      .run();
  });
}

/**
 * Synthesizes speech using Lab Subscription Platform.
 */
async function synthesizeWithLab(text, filename = null, _speakerId = 'PT', tempo = 0.88) {
  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  const frontendAudioDir = path.join(__dirname, '../../../frontend/public/audio');

  const chunks = splitTextIntoChunks(text.trim(), 240);
  const tempFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkBuffer = await requestLabTtsChunk(chunkText);
    if (!chunkBuffer) {
      tempFiles.forEach((fp) => {
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
      });
      return null;
    }

    const tempChunkPath = path.join(audioDir, `temp_chunk_${Date.now()}_${i}.wav`);
    fs.writeFileSync(tempChunkPath, chunkBuffer);
    tempFiles.push(tempChunkPath);
  }

  const isMp3Requested = !filename || filename.endsWith('.mp3');
  const ext = isMp3Requested && ffmpeg ? '.mp3' : '.wav';
  const finalFilename = filename
    ? (filename.includes('.') ? filename : `${filename}${ext}`)
    : `tts_lab_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;

  const finalFilePath = path.join(audioDir, finalFilename);

  if (ffmpeg) {
    if (tempFiles.length === 1) {
      await processAudioWithFfmpeg(tempFiles[0], finalFilePath, tempo);
    } else {
      await concatAudioFiles(tempFiles, finalFilePath, tempo);
    }
  } else {
    fs.copyFileSync(tempFiles[0], finalFilePath);
    tempFiles.forEach((fp) => {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
    });
  }

  if (fs.existsSync(frontendAudioDir) && fs.existsSync(finalFilePath)) {
    try {
      fs.copyFileSync(finalFilePath, path.join(frontendAudioDir, finalFilename));
    } catch (_) {}
  }

  if (isCloudinaryConfigured) {
    try {
      const cloudUrl = await uploadAudio(finalFilePath, { filename: finalFilename });
      if (cloudUrl && cloudUrl.startsWith('http')) {
        console.log(`☁️  [Lab TTS]: Audio permanently hosted on Cloudinary -> ${cloudUrl}`);
        return cloudUrl;
      }
    } catch (err) {
      console.warn(`[Lab TTS Cloudinary upload warning]:`, err.message);
    }
  }

  return `/audio/${finalFilename}`;
}

/**
 * Synthesizes speech using Khaya AI / Ghana NLP TTS API v2.
 */
async function synthesizeWithKhaya(text, filename = null, speakerId = 'female', tempo = 0.88) {
  const apiKey = process.env.KHAYA_API_KEY;
  if (!apiKey) {
    console.warn('[Khaya TTS] KHAYA_API_KEY is not set in .env');
    return null;
  }

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  const frontendAudioDir = path.join(__dirname, '../../../frontend/public/audio');

  const finalFilename = filename
    ? (filename.endsWith('.mp3') ? filename : `${filename}.mp3`)
    : `khaya_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;

  const finalFilePath = path.join(audioDir, finalFilename);
  const tempRawPath = path.join(audioDir, `temp_raw_${Date.now()}_${finalFilename}`);

  try {
    console.log(`[Khaya TTS] Calling Ghana NLP API v2 for "${text.slice(0, 40)}..."`);
    const response = await fetch(KHAYA_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        language: 'twi',
        speaker_id: speakerId || 'female',
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Khaya TTS Error (${response.status})]:`, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (ffmpeg) {
      fs.writeFileSync(tempRawPath, audioBuffer);
      await processAudioWithFfmpeg(tempRawPath, finalFilePath, tempo);
    } else {
      fs.writeFileSync(finalFilePath, audioBuffer);
    }

    if (fs.existsSync(frontendAudioDir) && fs.existsSync(finalFilePath)) {
      try {
        fs.copyFileSync(finalFilePath, path.join(frontendAudioDir, finalFilename));
      } catch (_) {}
    }

    if (isCloudinaryConfigured) {
      try {
        const cloudUrl = await uploadAudio(finalFilePath, { filename: finalFilename });
        if (cloudUrl && cloudUrl.startsWith('http')) {
          console.log(`☁️  [Khaya TTS]: Audio permanently hosted on Cloudinary -> ${cloudUrl}`);
          return cloudUrl;
        }
      } catch (err) {
        console.warn(`[Khaya TTS Cloudinary upload warning]:`, err.message);
      }
    }

    console.log(`✓ [Khaya TTS] Synthesized successfully: /audio/${finalFilename}`);
    return `/audio/${finalFilename}`;
  } catch (err) {
    console.error('[Khaya TTS Network Error]:', err.message);
    return null;
  }
}

/**
 * Unified Speech Synthesis with Hot-Swappable Providers ('lab' <-> 'khaya')
 * and Automatic Fallback Resilience.
 */
async function synthesizeSpeech(text, filename = null, speakerId = 'PT', tempo = 0.88) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    console.warn('[TTS Service] No text provided for speech synthesis');
    return null;
  }

  const primary = currentProvider;
  const secondary = primary === 'lab' ? 'khaya' : 'lab';

  console.log(`🎙️ [TTS Service] Synthesizing speech via primary provider: "${primary.toUpperCase()}"...`);

  let audioUrl = null;
  if (primary === 'khaya') {
    audioUrl = await synthesizeWithKhaya(text, filename, speakerId === 'PT' ? 'female' : speakerId, tempo);
  } else {
    audioUrl = await synthesizeWithLab(text, filename, 'PT', tempo);
  }

  // Graceful Automatic Fallback if Primary Provider Fails
  if (!audioUrl) {
    console.warn(`⚠️ [TTS Service] Primary provider "${primary}" failed. Falling back to "${secondary.toUpperCase()}"...`);
    if (secondary === 'khaya') {
      audioUrl = await synthesizeWithKhaya(text, filename, 'female', tempo);
    } else {
      audioUrl = await synthesizeWithLab(text, filename, 'PT', tempo);
    }
  }

  return audioUrl;
}

module.exports = {
  synthesizeSpeech,
  synthesizeTwiSpeech: synthesizeSpeech,
  synthesizeWithLab,
  synthesizeWithKhaya,
  getActiveTtsProvider,
  setActiveTtsProvider,
  getTtsProvidersStatus,
  splitTextIntoChunks,
  TTS_API_URL,
  KHAYA_TTS_URL
};
