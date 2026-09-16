const express = require('express');
const router = express.Router();
const { generateReminderXml, processReminderConfirm } = require('../services/reminderVoiceService');
const { getCallEventById, createCallEvent, getRecentCallEventsForMedication } = require('../db/queries/callEvents');
const { getMedicationById, getMedicationsByPatientId } = require('../db/queries/medications');
const { getPatientByPhoneNumber } = require('../db/queries/patients');

/**
 * @openapi
 * /voice/reminder:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Outbound reminder call webhook
 *     description: Africa's Talking webhook invoked when reminder connects. Returns GetDigits and Play tags.
 *     parameters:
 *       - in: query
 *         name: callEventId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Africa's Talking XML response
 *         content:
 *           text/xml:
 *             schema:
 *               type: string
 *               example: "<Response><GetDigits timeout='10' numDigits='1' callbackUrl='...'><Play url='...'/></GetDigits></Response>"
 */
router.post('/reminder', (req, res, next) => {
  try {
    let callEventId = req.query.callEventId || req.body.callEventId;
    let callEvent = callEventId ? getCallEventById(callEventId) : null;
    let medication = callEvent ? getMedicationById(callEvent.medication_id) : null;

    const callerPhone = req.body.callerNumber;
    const destPhone = req.body.destinationNumber;
    if (!callEvent) {
      const patient = (callerPhone && getPatientByPhoneNumber(callerPhone)) || (destPhone && getPatientByPhoneNumber(destPhone));
      if (patient) {
        const meds = getMedicationsByPatientId(patient.id);
        if (meds.length > 0) {
          medication = meds[0];
          callEvent = createCallEvent({
            patient_id: patient.id,
            medication_id: medication.id,
            scheduled_time: new Date().toISOString(),
            call_type: 'reminder',
            attempt_number: 1,
            dose_date: new Date().toISOString().split('T')[0]
          });
          callEventId = callEvent.id;
        }
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const audioUrl = medication ? medication.audio_url : `${baseUrl}/audio/default-reminder.mp3`;

    const xml = generateReminderXml(callEventId, audioUrl, baseUrl);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /voice/reminder/confirm:
 *   post:
 *     tags: [Voice Webhooks]
 *     summary: Reminder keypress confirmation callback
 *     description: Africa's Talking callback processing patient keypress (1=confirmed, 2=not_taken, 9=repeat, 0=help).
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               dtmfDigits:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       200:
 *         description: Africa's Talking acknowledgment XML
 *         content:
 *           text/xml:
 *             schema:
 *               type: string
 *               example: "<Response><Say>Thank you for confirming your medication.</Say></Response>"
 */
router.post('/reminder/confirm', (req, res, next) => {
  try {
    let callEventId = req.query.callEventId || req.body.callEventId;
    if (!callEventId || callEventId === 'undefined') {
      const callerPhone = req.body.callerNumber;
      const destPhone = req.body.destinationNumber;
      const patient = (callerPhone && getPatientByPhoneNumber(callerPhone)) || (destPhone && getPatientByPhoneNumber(destPhone));
      if (patient) {
        const meds = getMedicationsByPatientId(patient.id);
        if (meds.length > 0) {
          const recents = getRecentCallEventsForMedication(meds[0].id, 1);
          if (recents.length > 0) {
            callEventId = recents[0].id;
          }
        }
      }
    }

    const dtmfDigits = req.body.dtmfDigits || req.query.dtmfDigits;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const xml = processReminderConfirm(callEventId, dtmfDigits, baseUrl);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
