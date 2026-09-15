const express = require('express');
const router = express.Router();
const { handleInboundCall } = require('../services/inboundVoiceService');

/**
 * @openapi
 * /voice/inbound:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Inbound relisten call webhook
 *     description: Identifies calling patient by phone number and plays back their active medication audio.
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               callerNumber:
 *                 type: string
 *                 example: "+233546007121"
 *     responses:
 *       200:
 *         description: Africa's Talking XML response with Play tag
 *         content:
 *           text/xml:
 *             schema:
 *               type: string
 *               example: "<Response><Play url='http://.../audio/khaya_twi.mp3'/></Response>"
 */
router.post('/inbound', (req, res, next) => {
  try {
    const callerNumber = req.body.callerNumber || req.query.callerNumber;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const xml = handleInboundCall(callerNumber, baseUrl);

    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
