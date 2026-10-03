const express = require('express');
const router = express.Router({ mergeParams: true });
const { getMedicationsByPatientId } = require('../db/queries/medications');

/**
 * @openapi
 * /patients/{id}/medications:
 *   get:
 *     tags: [Medications]
 *     summary: List patient medications
 *     description: Returns all active and historical medication regimens for the specified patient.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of patient medications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 medications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Medication'
 */
router.get('/', (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const medications = getMedicationsByPatientId(patientId);

    // Auto-heal missing reminder_audio_url in background so subsequent refreshes have distinct audio
    medications.forEach((med) => {
      if (!med.reminder_audio_url && med.instruction_source === 'template') {
        const { generateDoseReminderAudio } = require('../services/reminderPipelineService');
        generateDoseReminderAudio({ patientId: med.patient_id, medicationId: med.id })
          .catch((err) => console.warn(`[Auto-Heal Reminder Audio Med #${med.id}]:`, err.message));
      }
    });

    res.json({ medications });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
