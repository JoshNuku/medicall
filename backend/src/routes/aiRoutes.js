const express = require('express');
const router = express.Router();
const fs = require('fs');
const upload = require('../middleware/uploadMiddleware');
const { transcribeAudio } = require('../services/sttService');

/**
 * @swagger
 * /ai/transcribe:
 *   post:
 *     summary: Transcribe audio dictation to text via Whisper ASR
 *     tags: [AI Voice]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: audio
 *         type: file
 *         required: true
 *         description: The voice recording audio file
 *       - in: formData
 *         name: language
 *         type: string
 *         description: Language code (default 'en')
 *     responses:
 *       200:
 *         description: Audio successfully transcribed
 *       400:
 *         description: Missing audio file
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded. Please send audio file under field name "audio".' });
    }

    const filePath = req.file.path;
    const language = req.body.language || 'en';

    console.log(`🎙️ [AI STT]: Transcribing received audio (${req.file.originalname || req.file.filename}) in language: ${language}...`);

    const transcript = await transcribeAudio(filePath, { language });

    console.log(`✓ [AI STT]: Transcript: "${transcript}"`);

    // Clean up temporary upload file if not needed for storage
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('[AI STT]: Could not remove temp audio file:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      language,
      transcript
    });
  } catch (error) {
    // If error occurs, attempt clean up
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    console.error('❌ [AI STT Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

const { parseDictation } = require('../services/dictationParserService');

/**
 * @swagger
 * /ai/extract:
 *   post:
 *     summary: Parse text transcript into structured prescription/patient JSON
 *     tags: [AI Voice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transcript:
 *                 type: string
 *               patientId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully parsed structured schema
 */
router.post('/extract', async (req, res, next) => {
  try {
    const { transcript, patientId, language } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Field "transcript" is required.' });
    }

    const structuredData = await parseDictation(transcript, { patientId, language });
    return res.status(200).json({
      success: true,
      data: structuredData
    });
  } catch (error) {
    console.error('❌ [AI Extract Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ai/dictate:
 *   post:
 *     summary: Complete Voice-to-Prescription pipeline (STT + Structured Extraction)
 *     tags: [AI Voice]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: audio
 *         type: file
 *         required: true
 *       - in: formData
 *         name: language
 *         type: string
 *       - in: formData
 *         name: patientId
 *         type: integer
 *     responses:
 *       200:
 *         description: Extracted clinical prescription and patient fields
 */
router.post('/dictate', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const filePath = req.file.path;
    const language = req.body.language || 'en';
    const patientId = req.body.patientId ? parseInt(req.body.patientId, 10) : null;

    console.log(`🎙️ [AI Dictation Pipeline]: Processing voice audio (language: ${language})...`);

    // 1. Transcribe audio to text
    const transcript = await transcribeAudio(filePath, { language });
    console.log(`✓ [AI Dictation Pipeline]: Transcript: "${transcript}"`);

    // 2. Extract structured schema via LLM (incorporating Khaya translation if Twi)
    const structuredData = await parseDictation(transcript, { patientId, language });

    // Clean up temporary audio file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {}
    }

    return res.status(200).json({
      success: true,
      transcript,
      data: structuredData
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    console.error('❌ [AI Dictation Error]:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
