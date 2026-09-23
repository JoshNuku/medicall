const db = require('../connection');

const getAllActiveMedications = async () => {
  const res = await db.query(`
    SELECT m.*, p.phone_number, p.name AS patient_name, p.caregiver_phone
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    WHERE p.consent_given = 1
  `);
  return res.rows;
};

const hasReminderCallToday = async (medicationId, doseDate, timeStr) => {
  const res = await db.query(`
    SELECT id FROM call_events
    WHERE medication_id = $1 AND dose_date = $2 AND scheduled_time::text LIKE $3 AND call_type = 'reminder'
    LIMIT 1
  `, [medicationId, doseDate, `%${timeStr}%`]);
  return res.rows.length > 0;
};

const getCallsNeedingRetry = async () => {
  const res = await db.query(`
    SELECT ce.*, m.schedule_times
    FROM call_events ce
    JOIN medications m ON ce.medication_id = m.id
    WHERE ce.outcome IN ('not_taken', 'no_answer', 'answered_no_keypress')
      AND ce.call_type IN ('reminder', 'retry')
      AND ce.attempt_number < 3
      AND NOT EXISTS (
        SELECT 1 FROM call_events r
        WHERE r.medication_id = ce.medication_id
          AND r.dose_date = ce.dose_date
          AND r.call_type = 'retry'
          AND r.attempt_number = ce.attempt_number + 1
      )
  `);
  return res.rows;
};

module.exports = {
  getAllActiveMedications,
  hasReminderCallToday,
  getCallsNeedingRetry
};
