const db = require('../connection');

const createCallEvent = async ({
  patient_id,
  medication_id,
  scheduled_time,
  actual_call_time = null,
  call_type,
  outcome = null,
  attempt_number = 1,
  dose_date,
  audio_url = null
}) => {
  const res = await db.query(`
    INSERT INTO call_events (
      patient_id, medication_id, scheduled_time, actual_call_time,
      call_type, outcome, attempt_number, dose_date, audio_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    patient_id,
    medication_id,
    scheduled_time,
    actual_call_time,
    call_type,
    outcome,
    attempt_number,
    dose_date,
    audio_url
  ]);

  return res.rows[0];
};

const updateCallAudioUrl = async (id, audio_url) => {
  const res = await db.query(`
    UPDATE call_events
    SET audio_url = $1
    WHERE id = $2
    RETURNING *
  `, [audio_url, id]);
  return res.rows[0] || null;
};

const updateCallOutcome = async (id, outcome, actual_call_time = new Date().toISOString()) => {
  const res = await db.query(`
    UPDATE call_events
    SET outcome = $1, actual_call_time = $2
    WHERE id = $3
    RETURNING *
  `, [outcome, actual_call_time, id]);
  return res.rows[0] || null;
};

const getCallEventById = async (id) => {
  const res = await db.query('SELECT * FROM call_events WHERE id = $1', [id]);
  return res.rows[0] || null;
};

const getRecentCallEventsForMedication = async (medicationId, limit = 10) => {
  const res = await db.query(`
    SELECT * FROM call_events
    WHERE medication_id = $1
    ORDER BY scheduled_time DESC
    LIMIT $2
  `, [medicationId, limit]);
  return res.rows;
};

const getTodayCallEvents = async () => {
  const today = new Date().toISOString().split('T')[0];
  const res = await db.query(`
    SELECT ce.*, p.name AS patient_name, p.phone_number AS patient_phone, m.drug_name
    FROM call_events ce
    JOIN patients p ON ce.patient_id = p.id
    JOIN medications m ON ce.medication_id = m.id
    WHERE ce.dose_date = $1 OR DATE(ce.scheduled_time) = CURRENT_DATE
    ORDER BY ce.scheduled_time DESC
  `, [today]);
  return res.rows;
};

const getAllCallEvents = async (limit = 100) => {
  const res = await db.query(`
    SELECT ce.*, p.name AS patient_name, p.phone_number AS patient_phone, m.drug_name
    FROM call_events ce
    JOIN patients p ON ce.patient_id = p.id
    JOIN medications m ON ce.medication_id = m.id
    ORDER BY ce.scheduled_time DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
};

const getLatestPendingCallEventForPatient = async (patientId) => {
  const res = await db.query(`
    SELECT * FROM call_events
    WHERE patient_id = $1 AND (outcome IS NULL OR outcome = 'pending')
    ORDER BY scheduled_time DESC
    LIMIT 1
  `, [patientId]);
  return res.rows[0] || null;
};

module.exports = {
  createCallEvent,
  updateCallAudioUrl,
  updateCallOutcome,
  getCallEventById,
  getRecentCallEventsForMedication,
  getTodayCallEvents,
  getAllCallEvents,
  getLatestPendingCallEventForPatient
};
