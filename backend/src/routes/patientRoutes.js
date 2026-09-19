const express = require('express');
const router = express.Router();
const { getAllPatients, getPatientById } = require('../db/queries/patients');

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
router.get('/', (req, res, next) => {
  try {
    res.json({ patients: getAllPatients() });
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
router.get('/:id', (req, res, next) => {
  try {
    const patient = getPatientById(parseInt(req.params.id, 10));
    if (!patient) return res.status(404).json({ error: 'Patient not found', status: 404 });
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
