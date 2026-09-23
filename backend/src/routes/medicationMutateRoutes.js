const express = require('express');
const router = express.Router({ mergeParams: true });
const { getMedicationById, updateMedication, deleteMedication } = require('../db/queries/medications');

/**
 * @openapi
 * /patients/{id}/medications/{medId}:
 *   put:
 *     tags: [Medications]
 *     summary: Update a medication regimen
 *     description: Updates editable fields (drug_name, schedule_times, duration_days, is_chronic) for an existing medication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: medId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               drug_name:
 *                 type: string
 *                 example: "Amoxicillin 500mg"
 *               schedule_times:
 *                 type: string
 *                 example: "08:00, 20:00"
 *               duration_days:
 *                 type: integer
 *                 example: 14
 *               is_chronic:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Medication updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 medication:
 *                   $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medication not found
 */
router.put('/:medId', (req, res, next) => {
  try {
    const medId = parseInt(req.params.medId, 10);
    const existing = getMedicationById(medId);
    if (!existing) {
      return res.status(404).json({ error: 'Medication not found', status: 404 });
    }

    const { drug_name, schedule_times, duration_days, is_chronic } = req.body;
    const updated = updateMedication(medId, { drug_name, schedule_times, duration_days, is_chronic });
    res.json({ medication: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /patients/{id}/medications/{medId}:
 *   delete:
 *     tags: [Medications]
 *     summary: Delete a medication regimen
 *     description: Permanently removes a medication and its associated call events (cascade).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: medId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Medication deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Medication deleted successfully"
 *                 medication:
 *                   $ref: '#/components/schemas/Medication'
 *       404:
 *         description: Medication not found
 */
router.delete('/:medId', (req, res, next) => {
  try {
    const medId = parseInt(req.params.medId, 10);
    const deleted = deleteMedication(medId);
    if (!deleted) {
      return res.status(404).json({ error: 'Medication not found', status: 404 });
    }
    res.json({ message: 'Medication deleted successfully', medication: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
