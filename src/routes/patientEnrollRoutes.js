const express = require('express');
const router = express.Router();
const { createPatient } = require('../db/queries/patients');

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
router.post('/', (req, res, next) => {
  try {
    const { phone_number, name, preferred_language, caregiver_phone } = req.body;
    if (!phone_number || !name) {
      return res.status(400).json({ error: 'phone_number and name are required', status: 400 });
    }
    const patient = createPatient({ phone_number, name, preferred_language, caregiver_phone });
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
