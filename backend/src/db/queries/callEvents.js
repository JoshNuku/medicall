const db = require('../connection');

const createCallEvent = ({
  patient_id,
  medication_id,
  scheduled_time,
  actual_call_time = null,
  call_type,
  outcome = null,
  attempt_number = 1,
  dose_date
}) => {
  const stmt = db.prepare(`
    INSERT INTO call_events (
      patient_id, medication_id, scheduled_time, actual_call_time,
      call_type, outcome, attempt_number, dose_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    patient_id,
    medication_id,
    scheduled_time,
    actual_call_time,
    call_type,
    outcome,
    attempt_number,
    dose_date
  );

  return getCallEventById(info.lastInsertRowid);
};

const updateCallOutcome = (id, outcome, actual_call_time = new Date().toISOString()) => {
  const stmt = db.prepare(`
    UPDATE call_events
    SET outcome = ?, actual_call_time = ?
    WHERE id = ?
  `);
  stmt.run(outcome, actual_call_time, id);
  return getCallEventById(id);
};

const getCallEventById = (id) => {
  return db.prepare('SELECT * FROM call_events WHERE id = ?').get(id);
};

const getRecentCallEventsForMedication = (medicationId, limit = 10) => {
  return db.prepare(`
    SELECT * FROM call_events
    WHERE medication_id = ?
    ORDER BY scheduled_time DESC
    LIMIT ?
  `).all(medicationId, limit);
};

const getTodayCallEvents = () => {
  return db.prepare(`
    SELECT ce.*, p.name AS patient_name, p.phone_number AS patient_phone, m.drug_name
    FROM call_events ce
    JOIN patients p ON ce.patient_id = p.id
    JOIN medications m ON ce.medication_id = m.id
    ORDER BY ce.scheduled_time DESC
  `).all();
};

module.exports = {
  createCallEvent,
  updateCallOutcome,
  getCallEventById,
  getRecentCallEventsForMedication,
  getTodayCallEvents
};
