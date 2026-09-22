const express = require('express');
const router = express.Router();
const { handleInboundCall, handleInboundSelect } = require('../services/inboundVoiceService');

/**
 * @openapi
 * /voice/inbound:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Inbound relisten call webhook
 *     description: Identifies calling patient by phone number and plays back active medication audio or IVR choice.
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

/**
 * @openapi
 * /voice/inbound/select:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Inbound medication selection or help keypress callback
 */
router.post('/inbound/select', (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.body.patientId;
    const medId = req.query.medId || req.body.medId;
    const dtmfDigits = req.body.dtmfDigits || req.query.dtmfDigits;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const xml = handleInboundSelect(patientId, dtmfDigits, baseUrl, medId);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

