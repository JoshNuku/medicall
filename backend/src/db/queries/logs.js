const db = require('../connection');

const getLogsByPatientId = (patientId) => {
  return db.prepare(`
    SELECT 
      ce.id AS call_event_id,
      ce.patient_id,
      ce.medication_id,
      m.drug_name,
      ce.scheduled_time,
      ce.actual_call_time,
      ce.call_type,
      ce.outcome,
      ce.attempt_number,
      ce.dose_date,
      dr.id AS diagnostic_response_id,
      dr.reason AS diagnostic_reason,
      dr.responded_at AS diagnostic_responded_at
    FROM call_events ce
    LEFT JOIN medications m ON ce.medication_id = m.id
    LEFT JOIN diagnostic_responses dr ON dr.call_event_id = ce.id
    WHERE ce.patient_id = ?
    ORDER BY ce.scheduled_time DESC
  `).all(patientId);
};

module.exports = {
  getLogsByPatientId
};
