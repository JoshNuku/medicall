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
 * Synthesizes Twi text into speech using Khaya AI TTS API v2.
 */
const synthesizeTwiSpeech = async (textTwi, filename = null, speakerId = 'female') => {
  if (!textTwi || !KHAYA_API_KEY) return null;

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const outputName = filename || `khaya_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
  const filePath = path.join(audioDir, outputName);

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
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
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
