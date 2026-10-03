const express = require('express');
const router = express.Router();
const {
  getActiveTtsProvider,
  setActiveTtsProvider,
  getTtsProvidersStatus,
  synthesizeWithLab,
  synthesizeWithKhaya
} = require('../services/ttsService');

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

module.exports = router;
