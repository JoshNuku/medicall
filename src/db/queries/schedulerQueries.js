const db = require('../connection');

const getAllActiveMedications = () => {
  return db.prepare(`
    SELECT m.*, p.phone_number, p.name AS patient_name, p.caregiver_phone
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    WHERE p.consent_given = 1
  `).all();
};

const hasReminderCallToday = (medicationId, doseDate, timeStr) => {
  const row = db.prepare(`
    SELECT id FROM call_events
    WHERE medication_id = ? AND dose_date = ? AND scheduled_time LIKE ? AND call_type = 'reminder'
  `).get(medicationId, doseDate, `%${timeStr}%`);
  return !!row;
};

const getCallsNeedingRetry = () => {
  return db.prepare(`
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
  `).all();
};

module.exports = {
  getAllActiveMedications,
  hasReminderCallToday,
  getCallsNeedingRetry
};
