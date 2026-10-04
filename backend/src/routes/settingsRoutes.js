const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  getActiveTtsProvider,
  setActiveTtsProvider,
  getTtsProvidersStatus,
  synthesizeWithLab,
  synthesizeWithKhaya
} = require('../services/ttsService');
const {
  getActiveAsrProvider,
  setActiveAsrProvider,
  getAsrProvidersStatus,
  transcribeAudio
} = require('../services/sttService');

/**
 * @openapi
 * /settings/tts-provider:
 *   get:
 *     tags: [Settings]
 *     summary: Get active TTS Engine provider status
 *     responses:
 *       200:
 *         description: Active TTS provider details
 */
router.get('/tts-provider', (req, res) => {
  res.json(getTtsProvidersStatus());
});

/**
 * @openapi
 * /settings/tts-provider:
 *   put:
 *     tags: [Settings]
 *     summary: Switch active TTS Engine provider seamlessly ('lab' or 'khaya')
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [lab, khaya]
 *     responses:
 *       200:
 *         description: Successfully switched active TTS provider
 */
router.put('/tts-provider', (req, res) => {
  const { provider } = req.body;
  if (!provider || !['lab', 'khaya'].includes(provider.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid provider. Expected "lab" or "khaya".',
      status: 400
    });
  }

  try {
    const updated = setActiveTtsProvider(provider);
    res.json({
      status: 'success',
      activeProvider: updated,
      ...getTtsProvidersStatus()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, status: 500 });
  }
});

/**
 * @openapi
 * /settings/tts-test:
 *   post:
 *     tags: [Settings]
 *     summary: Test audio synthesis for a specific provider
 */
router.post('/tts-test', async (req, res, next) => {
  try {
    const { provider, text } = req.body;
    const testText = text || 'Meda wo akye, yɛfrɛ wo firi MediCall sɛ yɛbɛkae wo wo nnuro no ho.';
    const filename = `test_${provider || 'active'}_${Date.now()}.mp3`;

    let audioUrl = null;
    if (provider === 'khaya') {
      audioUrl = await synthesizeWithKhaya(testText, filename, 'female');
    } else {
      audioUrl = await synthesizeWithLab(testText, filename, 'PT');
    }

    if (!audioUrl) {
      return res.status(502).json({
        error: `Failed to synthesize test audio with provider "${provider}". Check API key.`,
        status: 502
      });
    }

    res.json({
      status: 'success',
      provider: provider || getActiveTtsProvider(),
      audioUrl,
      text: testText
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /settings/asr-provider:
 *   get:
 *     tags: [Settings]
 *     summary: Get active ASR Engine provider status (groq vs lab)
 *     responses:
 *       200:
 *         description: Active ASR provider details
 */
router.get('/asr-provider', (req, res) => {
  res.json(getAsrProvidersStatus());
});

/**
 * @openapi
 * /settings/asr-provider:
 *   put:
 *     tags: [Settings]
 *     summary: Switch active ASR Engine provider ('groq' or 'lab')
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [groq, lab]
 *     responses:
 *       200:
 *         description: Successfully switched active ASR provider
 */
router.put('/asr-provider', (req, res) => {
  const { provider } = req.body;
  if (!provider || !['groq', 'lab'].includes(provider.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid provider. Expected "groq" or "lab".',
      status: 400
    });
  }

  try {
    const updated = setActiveAsrProvider(provider);
    res.json({
      status: 'success',
      activeProvider: updated,
      ...getAsrProvidersStatus()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, status: 500 });
  }
});

/**
 * @openapi
 * /settings/asr-test:
 *   post:
 *     tags: [Settings]
 *     summary: Test speech recognition (ASR) transcription for a specific provider
 */
router.post('/asr-test', async (req, res, next) => {
  try {
    const { provider } = req.body;
    const targetProvider = provider || getActiveAsrProvider();

    // Use available sample audio file
    const sampleCandidates = [
      path.join(__dirname, '../../public/audio/test_reminder_slow.mp3'),
      path.join(__dirname, '../../public/audio/default-reminder.mp3'),
      path.join(__dirname, '../../public/audio/metformin_en.mp3')
    ];

    let samplePath = sampleCandidates.find(p => fs.existsSync(p));
    if (!samplePath) {
      return res.status(404).json({ error: 'No test sample audio file found.' });
    }

    const startTime = Date.now();
    const transcript = await transcribeAudio(samplePath, { provider: targetProvider });
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      status: 'success',
      provider: targetProvider,
      transcript,
      sampleFile: path.basename(samplePath),
      processingTimeSeconds: parseFloat(elapsedSeconds)
    });
  } catch (err) {
    console.error('❌ [ASR Test Error]:', err.message);
    res.status(502).json({
      error: `Failed to transcribe test audio with provider "${req.body.provider || 'active'}": ${err.message}`,
      status: 502
    });
  }
});

module.exports = router;
