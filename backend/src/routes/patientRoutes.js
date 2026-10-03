const express = require('express');
const router = express.Router();
const { getAllPatients, getPatientById, updatePatient, deletePatient } = require('../db/queries/patients');
const { validatePhone } = require('../utils/phoneUtils');

/**
 * @openapi
 * /patients:
 *   get:
 *     tags: [Patients]
 *     summary: List all enrolled patients
 *     description: Returns an array of all registered patients in the system.
 *     responses:
 *       200:
 *         description: List of registered patients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 */
router.get('/', async (req, res, next) => {
  try {
    const patients = await getAllPatients();
    res.json({ patients });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Retrieve patient details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Patient profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const patient = await getPatientById(parseInt(req.params.id, 10));
    if (!patient) return res.status(404).json({ error: 'Patient not found', status: 404 });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Update patient profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               preferred_language:
 *                 type: string
 *                 enum: [twi, english]
 *               caregiver_phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated patient
 *       404:
 *         description: Patient not found
 */
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await getPatientById(id);
    if (!existing) return res.status(404).json({ error: 'Patient not found', status: 404 });

    const { name, phone_number, preferred_language, caregiver_phone, consent_given } = req.body;
    
    let validPhone = undefined;
    if (phone_number !== undefined) {
      const phoneValidation = validatePhone(phone_number, true);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ error: phoneValidation.error, status: 400 });
      }
      validPhone = phoneValidation.normalized;
    }

    let validCaregiver = undefined;
    if (caregiver_phone !== undefined) {
      if (caregiver_phone && String(caregiver_phone).trim()) {
        const caregiverValidation = validatePhone(caregiver_phone, false);
        if (!caregiverValidation.isValid) {
          return res.status(400).json({ error: `Caregiver phone: ${caregiverValidation.error}`, status: 400 });
        }
        validCaregiver = caregiverValidation.normalized;
      } else {
        validCaregiver = null;
      }
    }

    const updated = await updatePatient(id, {
      name,
      phone_number: validPhone,
      preferred_language,
      caregiver_phone: validCaregiver,
      consent_given
    });

    res.json({ patient: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /patients/{id}:
 *   delete:
 *     tags: [Patients]
 *     summary: Delete a patient and associated records
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Patient deleted successfully
 *       404:
 *         description: Patient not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await getPatientById(id);
    if (!existing) return res.status(404).json({ error: 'Patient not found', status: 404 });

    const deleted = await deletePatient(id);
    res.json({ success: true, message: `Patient ${deleted.name} deleted successfully`, patient: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
