const db = require('../connection');
const normalizePhone = (p) => (p ? String(p).replace(/[\s\-\(\)]/g, '') : '');

const createPatient = ({ phone_number, name, preferred_language = 'twi', caregiver_phone = null, consent_given = 1 }) => {
  const cleanPhone = normalizePhone(phone_number);
  const cleanCaregiver = caregiver_phone ? normalizePhone(caregiver_phone) : null;
  const stmt = db.prepare(`
    INSERT INTO patients (phone_number, name, preferred_language, caregiver_phone, consent_given)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(cleanPhone, name, preferred_language, cleanCaregiver, consent_given ? 1 : 0);
  return getPatientById(info.lastInsertRowid);
};

const getAllPatients = () => {
  return db.prepare(`
    SELECT 
      p.id, 
      p.phone_number, 
      p.name, 
      p.preferred_language, 
      p.caregiver_phone, 
      p.enrolled_at, 
      p.consent_given,
      latest_call.actual_call_time AS last_call_time,
      latest_call.scheduled_time AS last_scheduled_time,
      latest_call.outcome AS last_call_outcome,
      stats.total_calls,
      stats.confirmed_calls,
      stats.adherence_rate
    FROM patients p
    LEFT JOIN (
      SELECT ce1.patient_id, ce1.actual_call_time, ce1.scheduled_time, ce1.outcome
      FROM call_events ce1
      JOIN (
        SELECT patient_id, MAX(COALESCE(actual_call_time, scheduled_time)) as max_time
        FROM call_events
        WHERE outcome IS NOT NULL OR actual_call_time IS NOT NULL
        GROUP BY patient_id
      ) ce2 ON ce1.patient_id = ce2.patient_id AND (ce1.actual_call_time = ce2.max_time OR ce1.scheduled_time = ce2.max_time)
    ) latest_call ON p.id = latest_call.patient_id
    LEFT JOIN (
      SELECT 
        patient_id,
        COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END) AS total_calls,
        COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS confirmed_calls,
        ROUND(CAST(COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS FLOAT) * 100.0 / NULLIF(COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END), 0)) AS adherence_rate
      FROM call_events
      GROUP BY patient_id
    ) stats ON p.id = stats.patient_id
    ORDER BY p.enrolled_at DESC
  `).all();
};

const getPatientById = (id) => {
  return db.prepare(`
    SELECT 
      p.*,
      latest_call.actual_call_time AS last_call_time,
      latest_call.scheduled_time AS last_scheduled_time,
      latest_call.outcome AS last_call_outcome,
      stats.total_calls,
      stats.confirmed_calls,
      stats.adherence_rate
    FROM patients p
    LEFT JOIN (
      SELECT ce1.patient_id, ce1.actual_call_time, ce1.scheduled_time, ce1.outcome
      FROM call_events ce1
      JOIN (
        SELECT patient_id, MAX(COALESCE(actual_call_time, scheduled_time)) as max_time
        FROM call_events
        WHERE outcome IS NOT NULL OR actual_call_time IS NOT NULL
        GROUP BY patient_id
      ) ce2 ON ce1.patient_id = ce2.patient_id AND (ce1.actual_call_time = ce2.max_time OR ce1.scheduled_time = ce2.max_time)
    ) latest_call ON p.id = latest_call.patient_id
    LEFT JOIN (
      SELECT 
        patient_id,
        COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END) AS total_calls,
        COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS confirmed_calls,
        ROUND(CAST(COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS FLOAT) * 100.0 / NULLIF(COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END), 0)) AS adherence_rate
      FROM call_events
      GROUP BY patient_id
    ) stats ON p.id = stats.patient_id
    WHERE p.id = ?
  `).get(id);
};

const getPatientByPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  const clean = normalizePhone(phoneNumber);
  const digitsOnly = clean.replace(/\D/g, '');
  const last9 = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : null;

  const stmt = db.prepare(`
    SELECT 
      p.*,
      latest_call.actual_call_time AS last_call_time,
      latest_call.scheduled_time AS last_scheduled_time,
      latest_call.outcome AS last_call_outcome
    FROM patients p
    LEFT JOIN (
      SELECT ce1.patient_id, ce1.actual_call_time, ce1.scheduled_time, ce1.outcome
      FROM call_events ce1
      JOIN (
        SELECT patient_id, MAX(scheduled_time) as max_time
        FROM call_events
        GROUP BY patient_id
      ) ce2 ON ce1.patient_id = ce2.patient_id AND ce1.scheduled_time = ce2.max_time
    ) latest_call ON p.id = latest_call.patient_id
    WHERE REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', '') = ?
       OR p.phone_number = ?
       OR p.phone_number = ?
       OR (? IS NOT NULL AND substr(REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', ''), -9) = ?)
  `);
  return stmt.get(digitsOnly, clean, phoneNumber, last9, last9 || '');
};

const updateCaregiverNotifiedAt = (patientId, timestamp = new Date().toISOString()) => {
  return db.prepare('UPDATE patients SET caregiver_notified_at = ? WHERE id = ?').run(timestamp, patientId);
};

const resetCaregiverNotifiedAt = (patientId) => {
  return db.prepare('UPDATE patients SET caregiver_notified_at = NULL WHERE id = ?').run(patientId);
};

const updatePatient = (id, fields = {}) => {
  const patient = getPatientById(id);
  if (!patient) return null;

  const updates = [];
  const values = [];

  if (fields.name !== undefined) {
    updates.push('name = ?');
    values.push(fields.name.trim());
  }
  if (fields.phone_number !== undefined) {
    updates.push('phone_number = ?');
    values.push(normalizePhone(fields.phone_number));
  }
  if (fields.preferred_language !== undefined) {
    updates.push('preferred_language = ?');
    values.push(fields.preferred_language);
  }
  if (fields.caregiver_phone !== undefined) {
    updates.push('caregiver_phone = ?');
    values.push(fields.caregiver_phone ? normalizePhone(fields.caregiver_phone) : null);
  }
  if (fields.consent_given !== undefined) {
    updates.push('consent_given = ?');
    values.push(fields.consent_given ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return getPatientById(id);
};

const deletePatient = (id) => {
  const patient = getPatientById(id);
  if (!patient) return null;

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM agent_conversations WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM escalations WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM diagnostic_responses WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM call_events WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM medications WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return patient;
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  getPatientByPhoneNumber,
  updateCaregiverNotifiedAt,
  resetCaregiverNotifiedAt,
  updatePatient,
  deletePatient
};

