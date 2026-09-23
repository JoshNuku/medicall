const express = require('express');
const router = express.Router();

/**
 * @openapi
 * /status-check:
 *   get:
 *     tags: [System]
 *     summary: Application status check
 *     description: Returns operational status of the MediCall backend and current server timestamp.
 *     responses:
 *       200:
 *         description: Server is running normally
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   example: "2026-09-15T12:00:00.000Z"
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
