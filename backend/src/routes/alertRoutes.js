const express = require('express');
const router = express.Router();
const { getOpenEscalationsWithPatient, resolveEscalation } = require('../db/queries/escalations');

/**
 * @openapi
 * /alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Get open escalation alerts
 *     description: Retrieves all open adherence escalations joined with patient contact details.
 *     responses:
 *       200:
 *         description: List of active escalation alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EscalationAlert'
 */
router.get('/', async (req, res, next) => {
  try {
    const alerts = await getOpenEscalationsWithPatient();
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /alerts/{id}/resolve:
 *   post:
 *     tags: [Alerts]
 *     summary: Resolve an escalation alert
 *     description: Marks an escalation alert as resolved by a clinician or pharmacist.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolved_by:
 *                 type: string
 *                 example: "Dr. Mensah"
 *     responses:
 *       200:
 *         description: Alert marked as resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 escalation: { $ref: '#/components/schemas/EscalationAlert' }
 */
router.post('/:id/resolve', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { resolved_by } = req.body;
    const resolved = await resolveEscalation(id, resolved_by || 'pharmacist');
    res.json({ success: true, escalation: resolved });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
