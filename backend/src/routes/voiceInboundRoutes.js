const express = require('express');
const router = express.Router();
const { handleInboundCall, handleInboundSelect } = require('../services/inboundVoiceService');

const resolveBaseUrl = (req) => {
  if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
    return process.env.BASE_URL;
  }
  const host = req?.headers?.['x-forwarded-host'] || req?.get?.('host');
  const proto = req?.headers?.['x-forwarded-proto'] || (req?.secure ? 'https' : 'http');
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  return `${proto}://${host || 'localhost:3000'}`;
};

/**
 * @openapi
 * /voice/inbound:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Inbound relisten call webhook
 *     description: Identifies calling patient by phone number and plays back active medication audio or IVR choice.
 */
router.all('/inbound', async (req, res, next) => {
  try {
    const callerNumber = req.body?.callerNumber || req.query?.callerNumber;
    const baseUrl = resolveBaseUrl(req);
    const xml = await handleInboundCall(callerNumber, baseUrl);

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
router.all('/inbound/select', async (req, res, next) => {
  try {
    const patientId = req.query?.patientId || req.body?.patientId;
    const medId = req.query?.medId || req.body?.medId;
    const dtmfDigits = req.body?.dtmfDigits !== undefined ? req.body.dtmfDigits : req.query?.dtmfDigits;
    const baseUrl = resolveBaseUrl(req);

    const xml = await handleInboundSelect(patientId, dtmfDigits, baseUrl, medId);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
