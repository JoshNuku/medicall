const express = require('express');
const router = express.Router();
const { createPatient, getPatientByPhoneNumber } = require('../db/queries/patients');
const { validatePhone } = require('../utils/phoneUtils');

/**
 * @openapi
 * /patients:
 *   post:
 *     tags: [Patients]
 *     summary: Enroll a new patient
 *     description: Registers a new patient with phone number and optional caregiver contact.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone_number, name]
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+233546007121"
 *               name:
 *                 type: string
 *                 example: "Kwame Mensah"
 *               preferred_language:
 *                 type: string
 *                 example: "twi"
 *               caregiver_phone:
 *                 type: string
 *                 example: "+233501234567"
 *     responses:
 *       201:
 *         description: Patient enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', async (req, res, next) => {
  try {
    const { phone_number, name, preferred_language, caregiver_phone } = req.body;
    if (!phone_number || !name) {
      return res.status(400).json({ error: 'phone_number and name are required', status: 400 });
    }

    const phoneValidation = validatePhone(phone_number, true);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error, status: 400 });
    }

    // Check if phone number is already enrolled
    const existingPatient = await getPatientByPhoneNumber(phoneValidation.normalized);
    if (existingPatient) {
      return res.status(409).json({
        error: 'A patient with this phone number is already enrolled.',
        status: 409
      });
    }

    let validCaregiver = null;
    if (caregiver_phone && String(caregiver_phone).trim()) {
      const caregiverValidation = validatePhone(caregiver_phone, false);
      if (!caregiverValidation.isValid) {
        return res.status(400).json({ error: `Caregiver phone: ${caregiverValidation.error}`, status: 400 });
      }
      validCaregiver = caregiverValidation.normalized;
    }

    const patient = await createPatient({
      phone_number: phoneValidation.normalized,
      name,
      preferred_language,
      caregiver_phone: validCaregiver
    });
    res.status(201).json({ patient });
  } catch (err) {
    if (err.code === '23505' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
      return res.status(409).json({
        error: 'A patient with this phone number is already enrolled in the system.',
        status: 409
      });
    }
    next(err);
  }
});

module.exports = router;
