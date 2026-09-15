const express = require('express');
const router = express.Router();
const { generateDiagnosticXml, processDiagnosticConfirm } = require('../services/diagnosticVoiceService');

/**
 * @openapi
 * /voice/diagnostic:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Diagnostic reason menu webhook
 *     description: Prompts patient for non-adherence reason (1=cost, 2=side effects, 3=forgot, 4=other).
 *     parameters:
 *       - in: query
 *         name: callEventId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Africa's Talking XML with GetDigits reason prompt
 *         content:
 *           text/xml:
 *             schema:
 *               type: string
 *               example: "<Response><GetDigits timeout='15' numDigits='1' callbackUrl='...'><Say>Why were you unable to take your medication?...</Say></GetDigits></Response>"
 */
router.post('/diagnostic', (req, res, next) => {
  try {
    const callEventId = req.query.callEventId || req.body.callEventId;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const xml = generateDiagnosticXml(callEventId, baseUrl);

    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /voice/diagnostic/confirm:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Diagnostic reason keypress confirmation
 *     description: Logs non-adherence reason and evaluates escalation rules in decision engine.
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               dtmfDigits:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       200:
 *         description: Africa's Talking XML closing acknowledgment
 *         content:
 *           text/xml:
 *             schema:
 *               type: string
 *               example: "<Response><Say>Thank you for your feedback. Take care.</Say></Response>"
 */
router.post('/diagnostic/confirm', async (req, res, next) => {
  try {
    const callEventId = req.query.callEventId || req.body.callEventId;
    const dtmfDigits = req.body.dtmfDigits || req.query.dtmfDigits;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const xml = await processDiagnosticConfirm(callEventId, dtmfDigits, baseUrl);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
