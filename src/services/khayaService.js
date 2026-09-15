const fs = require('fs');
const path = require('path');
require('dotenv').config();

const KHAYA_API_KEY = process.env.KHAYA_API_KEY;
const KHAYA_API_URL = process.env.KHAYA_API_URL || 'https://translation-api.ghananlp.org/tts/v2/synthesize';

/**
 * Synthesizes verified Twi text into speech using Khaya AI TTS API v2.
 * Saves the audio file to public/audio and returns the public relative URL.
 */
const synthesizeTwiSpeech = async (textTwi, filename = null, speakerId = 'female') => {
  if (!textTwi) return null;

  const audioDir = path.join(__dirname, '../../public/audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const outputName = filename || `khaya_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
  const filePath = path.join(audioDir, outputName);

  if (!KHAYA_API_KEY) {
    console.warn('[Khaya AI v2] KHAYA_API_KEY is not set. Skipping TTS generation.');
    return null;
  }

  try {
    const endpoint = KHAYA_API_URL.endsWith('/synthesize')
      ? KHAYA_API_URL
      : `${KHAYA_API_URL.replace(/\/+$/, '')}/synthesize`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
        'x-api-key': KHAYA_API_KEY,
        'Authorization': `Bearer ${KHAYA_API_KEY}`
      },
      body: JSON.stringify({
        text: textTwi,
        language: 'twi',
        speaker_id: speakerId,
        stream: false,
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Khaya AI v2] TTS failed (${response.status}):`, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    return `/audio/${outputName}`;
  } catch (err) {
    console.error('[Khaya AI v2] Network or parsing error:', err.message);
    return null;
  }
};

module.exports = {
  synthesizeTwiSpeech
};
