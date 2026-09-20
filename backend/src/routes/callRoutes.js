const express = require('express');
const router = express.Router();
const { getTodayCallEvents, createCallEvent } = require('../db/queries/callEvents');
const { getPatientById, getPatientByPhoneNumber } = require('../db/queries/patients');
const { getMedicationsByPatientId } = require('../db/queries/medications');
const { makeOutboundCall } = require('../services/africasTalkingService');

/**
 * @openapi
 * /calls/today:
 *   get:
 *     tags: [Call Events]
 *     summary: Retrieve today's scheduled and executed medication reminder calls
 *     description: Returns chronological list of all voice reminder calls for the current day across all patients.
 *     responses:
 *       200:
 *         description: List of today's call events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calls:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/today', (req, res, next) => {
  try {
    const calls = getTodayCallEvents();
    res.json({ calls });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /calls/trigger:
 *   post:
 *     tags: [Call Events]
 *     summary: Trigger an instant outbound reminder call to a patient
 *     description: Directly dispatches a live voice call via Africa's Talking.
 */
router.post('/trigger', async (req, res, next) => {
  try {
    const { patient_id, phone_number } = req.body;
    let patient = null;
    if (patient_id) {
      patient = getPatientById(patient_id);
    } else if (phone_number) {
      patient = getPatientByPhoneNumber(phone_number);
    }
    const targetPhone = phone_number || (patient ? patient.phone_number : null);
    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number or valid patient ID is required' });
    }

    let medicationId = null;
    if (patient) {
      const meds = getMedicationsByPatientId(patient.id);
      if (meds.length > 0) medicationId = meds[0].id;
    }

    const callEvent = createCallEvent({
      patient_id: patient ? patient.id : 1,
      medication_id: medicationId || 1,
      scheduled_time: new Date().toISOString(),
      call_type: 'reminder',
      attempt_number: 1,
      dose_date: new Date().toISOString().split('T')[0]
    });

    const callResult = await makeOutboundCall(targetPhone);
    res.json({
      status: 'success',
      callEvent,
      result: callResult
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
