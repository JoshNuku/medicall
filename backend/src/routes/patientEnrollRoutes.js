const express = require('express');
const router = express.Router();
const { createPatient, getPatientByPhoneNumber } = require('../db/queries/patients');

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
 *       400:
 *         description: Missing or invalid required fields
 *       409:
 *         description: Phone number already registered
 */
router.post('/', async (req, res, next) => {
  try {
    const { phone_number, name, preferred_language = 'twi', caregiver_phone } = req.body;

    // 1. Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Patient full name is required.',
        code: 'MISSING_NAME',
        status: 400
      });
    }

    // 2. Validate phone number
    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({
        error: 'Phone number is required for medication adherence calls.',
        code: 'MISSING_PHONE',
        status: 400
      });
    }

    const cleanPhone = phone_number.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.length < 9) {
      return res.status(400).json({
        error: 'Please enter a valid phone number (at least 9 digits, e.g. +233 20 019 3622).',
        code: 'INVALID_PHONE',
        status: 400
      });
    }

    // 3. Check for existing patient with duplicate phone number
    const existing = await getPatientByPhoneNumber(cleanPhone);
    if (existing) {
      return res.status(409).json({
        error: `A patient with phone number ${phone_number.trim()} is already registered.`,
        code: 'DUPLICATE_PHONE',
        status: 409
      });
    }

    // 4. Enroll new patient
    const patient = await createPatient({
      phone_number: cleanPhone,
      name: name.trim(),
      preferred_language,
      caregiver_phone: caregiver_phone?.trim() || null
    });

    res.status(201).json({
      success: true,
      message: `Patient ${patient.name} enrolled successfully.`,
      patient
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
