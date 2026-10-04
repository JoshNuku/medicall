const fs = require('fs');
const path = require('path');
require('dotenv').config();

const KHAYA_API_KEY = process.env.KHAYA_API_KEY;
const KHAYA_TRANSLATE_URL = process.env.KHAYA_TRANSLATE_URL || 'https://translation-api.ghananlp.org/v1/translate';
const KHAYA_TTS_URL = process.env.KHAYA_API_URL || 'https://translation-api.ghananlp.org/tts/v2/synthesize';

/**
 * Translates English text to Twi using Khaya AI / Ghana NLP Translation API.
 */
const translateEnglishToTwi = async (englishText) => {
  if (!englishText) return null;
  if (!KHAYA_API_KEY) {
    console.warn('[Khaya AI] KHAYA_API_KEY is not set in .env');
    return null;
  }

  try {
    const response = await fetch(KHAYA_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
        'x-api-key': KHAYA_API_KEY
      },
      body: JSON.stringify({
        in: englishText,
        lang: 'en-tw'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Khaya AI Translation] Failed (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json().catch(async () => await response.text());
    if (typeof data === 'string') return data.trim();
    return data.out || data.translated_text || data.text || JSON.stringify(data);
  } catch (err) {
    console.error('[Khaya AI Translation] Error:', err.message);
    return null;
  }
};

/**
 * Translates Twi text to English using Khaya AI / Ghana NLP Translation API.
 */
const translateTwiToEnglish = async (twiText) => {
  if (!twiText) return null;
  if (!KHAYA_API_KEY) {
    console.warn('[Khaya AI] KHAYA_API_KEY is not set in .env');
    return null;
  }

  try {
    const response = await fetch(KHAYA_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
        'x-api-key': KHAYA_API_KEY
      },
      body: JSON.stringify({
        in: twiText,
        lang: 'tw-en'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Khaya AI Twi-to-English Translation] Failed (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json().catch(async () => await response.text());
    if (typeof data === 'string') return data.trim();
    return data.out || data.translated_text || data.text || JSON.stringify(data);
  } catch (err) {
    console.error('[Khaya AI Twi-to-English Translation] Error:', err.message);
    return null;
  }
};

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
 * Adjusts audio playback speed (tempo) without changing pitch.
 * E.g. tempo = 0.88 slows down speech by 12% for patient clarity.
 */
const adjustAudioTempo = (inputPath, outputPath, tempo = 0.88) => {
  if (!ffmpeg) return Promise.resolve(inputPath);

  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .audioFilters(`atempo=${tempo}`)
      .output(outputPath)
      .on('end', () => {
        // Clean up temporary raw file
        try {
          if (fs.existsSync(inputPath) && inputPath !== outputPath) {
            fs.unlinkSync(inputPath);
          }
        } catch {
          // Ignore unlink errors
        }
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.warn(`[FFmpeg Tempo Warning]: ${err.message}. Keeping raw audio.`);
        resolve(inputPath);
      })
      .run();
  });
};

const { synthesizeSpeech } = require('./ttsService');

/**
 * Synthesizes Twi text into speech using the Lab Subscription Platform TTS API (model_type: 'ss', speaker: 'PT').
 */
const synthesizeTwiSpeech = async (textTwi, filename = null, speakerId = 'PT', tempo = 0.88) => {
  return synthesizeSpeech(textTwi, filename, speakerId, tempo);
};

module.exports = {
  translateEnglishToTwi,
  translateTwiToEnglish,
  synthesizeTwiSpeech
};

