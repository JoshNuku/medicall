const express = require('express');
const router = express.Router();
const { getTodayCallEvents } = require('../db/queries/callEvents');

/**
 * @openapi
 * /calls/today:
 *   get:
 *     tags: [Call Events]
 *     summary: Retrieve today's scheduled and executed medication reminder calls
 *     description: Returns chronological list of all voice reminder calls for the current day across all patients.
 *     responses:
 *       200:
 *         description: List of today's call events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calls:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/today', (req, res, next) => {
  try {
    const calls = getTodayCallEvents();
    res.json({ calls });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
