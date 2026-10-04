const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { isConfigured: isCloudinaryConfigured, getAudioMap } = require('../services/cloudinaryService');
const { getActiveTtsProvider, getTtsProvidersStatus } = require('../services/ttsService');
const { getAllPatients } = require('../db/queries/patients');
const { getOpenEscalationsWithPatient } = require('../db/queries/escalations');
const { getTodayCallEvents } = require('../db/queries/callEvents');

// Lightweight ping endpoints for fast uptime monitors (e.g. UptimeRobot, Render internal health check)
router.get('/ping', (req, res) => res.status(200).send('pong'));
router.head('/ping', (req, res) => res.status(200).end());
router.head('/', (req, res) => res.status(200).end());

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Comprehensive system diagnostics & service readiness
 *     description: Returns operational status of Neon PostgreSQL, Cloudinary CDN, TTS engines, Africa's Talking telephony, and AI Agent.
 *     responses:
 *       200:
 *         description: All system components are operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "healthy" }
 *                 timestamp: { type: string, example: "2026-10-03T18:00:00.000Z" }
 *                 services:
 *                   type: object
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs = null;
  let dbCounts = { patients: 0, openAlerts: 0, callsToday: 0 };

  try {
    const dbStart = Date.now();
    const [patients, alerts, calls] = await Promise.all([
      getAllPatients().catch(() => []),
      getOpenEscalationsWithPatient().catch(() => []),
      getTodayCallEvents().catch(() => [])
    ]);
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
    dbCounts = {
      patients: patients.length,
      openAlerts: alerts.length,
      callsToday: calls.length
    };
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  const audioMap = getAudioMap();
  const totalMappedAudios = Object.keys(audioMap).length;

  const ttsStatus = getTtsProvidersStatus();
  const atConfigured = Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME);
  const aiAgentEnabled = process.env.ENABLE_AI_AGENT === 'true';

  const isHealthy = dbStatus === 'connected';

  // Return 200 OK so uptime monitors don't false-alarm when optional CDN is initializing
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? (isCloudinaryConfigured ? 'healthy' : 'degraded') : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - startTime,
    version: '1.0.0',
    services: {
      database: {
        status: dbStatus,
        type: db.isPostgres ? 'Neon PostgreSQL (Cloud Serverless)' : 'SQLite (Local)',
        latencyMs: dbLatencyMs,
        counts: dbCounts
      },
      cloudinary: {
        status: isCloudinaryConfigured ? 'connected' : 'unconfigured',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'deplhwhk7',
        preUploadedAssetsCount: totalMappedAudios,
        cdnDomain: 'res.cloudinary.com'
      },
      ttsEngine: {
        status: 'ready',
        activeProvider: getActiveTtsProvider(),
        ...ttsStatus
      },
      telephony: {
        status: atConfigured ? 'configured' : 'missing_credentials',
        provider: "Africa's Talking",
        voiceNumber: process.env.AT_VOICE_PHONE_NUMBER || '+233308048104',
        username: process.env.AT_USERNAME || 'medicall012'
      },
      aiAgent: {
        enabled: aiAgentEnabled,
        provider: 'Groq Cloud',
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
      }
    }
  });
});

module.exports = router;
