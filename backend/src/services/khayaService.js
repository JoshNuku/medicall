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

/**
 * Synthesizes Twi text into speech using Khaya AI TTS API v2,
 * then slows down the speech tempo slightly (0.88x) for clear patient comprehension.
 */
const synthesizeTwiSpeech = async (textTwi, filename = null, speakerId = 'female', tempo = 0.88) => {
  if (!textTwi || !KHAYA_API_KEY) return null;

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const outputName = filename || `khaya_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
  const finalFilePath = path.join(audioDir, outputName);
  const tempRawPath = path.join(audioDir, `temp_raw_${Date.now()}_${outputName}`);

  try {
    const response = await fetch(KHAYA_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
        'x-api-key': KHAYA_API_KEY
      },
      body: JSON.stringify({
        text: textTwi,
        language: 'twi',
        speaker_id: speakerId,
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Khaya AI TTS] Failed (${response.status}):`, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (ffmpeg) {
      fs.writeFileSync(tempRawPath, audioBuffer);
      await adjustAudioTempo(tempRawPath, finalFilePath, tempo);
    } else {
      fs.writeFileSync(finalFilePath, audioBuffer);
    }

    return `/audio/${outputName}`;
  } catch (err) {
    console.error('[Khaya AI TTS] Error:', err.message);
    return null;
  }
};

module.exports = {
  translateEnglishToTwi,
  synthesizeTwiSpeech
};
