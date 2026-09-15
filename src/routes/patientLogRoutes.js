const express = require('express');
const router = express.Router({ mergeParams: true });
const { getLogsByPatientId } = require('../db/queries/logs');

/**
 * @openapi
 * /patients/{id}/logs:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient call and diagnostic logs
 *     description: Retrieves chronological call event history joined with diagnostic responses.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Call and diagnostic event logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       call_event_id: { type: integer, example: 1 }
 *                       drug_name: { type: string, example: "Amoxicillin 500mg" }
 *                       scheduled_time: { type: string, example: "2026-09-15T08:00:00.000Z" }
 *                       call_type: { type: string, example: "reminder" }
 *                       outcome: { type: string, example: "confirmed" }
 *                       dose_date: { type: string, example: "2026-09-15" }
 *                       diagnostic_reason: { type: string, nullable: true, example: null }
 */
router.get('/', (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const logs = getLogsByPatientId(patientId);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
