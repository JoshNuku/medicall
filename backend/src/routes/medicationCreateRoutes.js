const express = require('express');
const router = express.Router({ mergeParams: true });
const upload = require('../middleware/uploadMiddleware');
const { registerMedication } = require('../services/medicationService');

/**
 * @openapi
 * /patients/{id}/medications:
 *   post:
 *     tags: [Medications]
 *     summary: Create medication regimen for patient
 *     description: Enrolls medication in template mode (verified Twi dropdowns) or recorded mode (pharmacist audio upload).
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
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateMedicationPayload'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMedicationPayload'
 *     responses:
 *       201:
 *         description: Medication registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 medication:
 *                   $ref: '#/components/schemas/Medication'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { drug_name, instruction_source, dosage_template_id, frequency_template_id, timing_template_id, schedule_times, duration_days, is_chronic, language } = req.body;

    if (!drug_name || !instruction_source || !schedule_times) {
      return res.status(400).json({ error: 'drug_name, instruction_source, and schedule_times are required', status: 400 });
    }

    const audioFileUrl = req.file ? `/audio/${req.file.filename}` : null;
    const medication = await registerMedication({
      patientId,
      drugName: drug_name,
      instructionSource: instruction_source,
      dosageTemplateId: dosage_template_id ? parseInt(dosage_template_id, 10) : null,
      frequencyTemplateId: frequency_template_id ? parseInt(frequency_template_id, 10) : null,
      timingTemplateId: timing_template_id ? parseInt(timing_template_id, 10) : null,
      scheduleTimes: schedule_times,
      durationDays: duration_days,
      isChronic: is_chronic === 'true' || is_chronic === true || is_chronic === 1,
      audioFileUrl,
      language
    });

    res.status(201).json({ medication });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
