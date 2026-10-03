const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TTS_API_URL = process.env.TTS_API_URL || process.env.LAB_TTS_URL || 'https://lab-subscription-platform.vercel.app/api/v1/tts';
const TTS_API_KEY = process.env.TTS_API_KEY || process.env.LAB_TTS_API_KEY;

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
 * Uses model_type = 'ss' and speaker = 'PT'.
 * Returns Buffer of WAV audio on success, or null on error.
 */
async function requestTtsChunk(text) {
  const apiKey = process.env.TTS_API_KEY || process.env.LAB_TTS_API_KEY;
  if (!apiKey) {
    console.warn('[TTS Service] TTS_API_KEY is not set in .env. Please add TTS_API_KEY=speech_live_... to backend/.env');
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

      console.error(`[TTS Service Error (${response.status})]: ${errCode} - ${errMsg} (Request ID: ${reqId})`);
      return null;
    }

    const reqId = response.headers.get('x-request-id');
    const duration = response.headers.get('x-duration-sec');
    const chars = response.headers.get('x-characters-used');
    console.log(`[TTS Service] Synthesized successfully (${chars || text.length} chars, ~${duration || '?'}s, Request ID: ${reqId || 'ok'})`);

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[TTS Service Network Error]:', err.message);
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
        // Clean up individual chunk files
        filePaths.forEach((fp) => {
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch (_) {}
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
 * Synthesizes speech from text using the Lab Subscription Platform TTS API (model_type: 'ss', speaker: 'PT').
 *
 * @param {string} text - The text to synthesize (e.g. Twi medication reminder)
 * @param {string|null} filename - Optional custom output filename (e.g. 'reminder_123.mp3' or 'reminder_123.wav')
 * @param {string} _speakerId - Kept for signature compatibility (service enforces 'PT' as required by API)
 * @param {number} tempo - Speech tempo playback multiplier (default: 0.88 for patient comprehension)
 * @returns {Promise<string|null>} - Relative public audio URL, e.g. '/audio/prescription_123.mp3'
 */
async function synthesizeSpeech(text, filename = null, _speakerId = 'PT', tempo = 0.88) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    console.warn('[TTS Service] No text provided for speech synthesis');
    return null;
  }

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const frontendAudioDir = path.join(__dirname, '../../../frontend/public/audio');

  const chunks = splitTextIntoChunks(text.trim(), 240);
  const tempFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkBuffer = await requestTtsChunk(chunkText);
    if (!chunkBuffer) {
      // Clean up any earlier chunks if one fails
      tempFiles.forEach((fp) => {
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
      });
      return null;
    }

    const tempChunkPath = path.join(audioDir, `temp_chunk_${Date.now()}_${i}.wav`);
    fs.writeFileSync(tempChunkPath, chunkBuffer);
    tempFiles.push(tempChunkPath);
  }

  // Determine output file naming
  const isMp3Requested = !filename || filename.endsWith('.mp3');
  const ext = isMp3Requested && ffmpeg ? '.mp3' : '.wav';
  const finalFilename = filename
    ? (filename.includes('.') ? filename : `${filename}${ext}`)
    : `tts_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;

  const finalFilePath = path.join(audioDir, finalFilename);

  if (ffmpeg) {
    if (tempFiles.length === 1) {
      await processAudioWithFfmpeg(tempFiles[0], finalFilePath, tempo);
    } else {
      await concatAudioFiles(tempFiles, finalFilePath, tempo);
    }
  } else {
    // If no ffmpeg, use first wav file directly
    fs.copyFileSync(tempFiles[0], finalFilePath);
    tempFiles.forEach((fp) => {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
    });
  }

  // Sync to frontend/public/audio for instant UI preview
  if (fs.existsSync(frontendAudioDir) && fs.existsSync(finalFilePath)) {
    try {
      fs.copyFileSync(finalFilePath, path.join(frontendAudioDir, finalFilename));
    } catch (_) {}
  }

  return `/audio/${finalFilename}`;
}

module.exports = {
  synthesizeSpeech,
  synthesizeTwiSpeech: synthesizeSpeech,
  splitTextIntoChunks,
  TTS_API_URL
};
