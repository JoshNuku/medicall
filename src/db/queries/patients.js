const db = require('../connection');

const createPatient = ({ phone_number, name, preferred_language = 'twi', caregiver_phone = null, consent_given = 1 }) => {
  const stmt = db.prepare(`
    INSERT INTO patients (phone_number, name, preferred_language, caregiver_phone, consent_given)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(phone_number, name, preferred_language, caregiver_phone, consent_given ? 1 : 0);
  return getPatientById(info.lastInsertRowid);
};

const getAllPatients = () => {
  return db.prepare('SELECT id, phone_number, name, preferred_language, caregiver_phone, enrolled_at, consent_given FROM patients ORDER BY enrolled_at DESC').all();
};

const getPatientById = (id) => {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
};

const getPatientByPhoneNumber = (phoneNumber) => {
  return db.prepare('SELECT * FROM patients WHERE phone_number = ?').get(phoneNumber);
};

const updateCaregiverNotifiedAt = (patientId, timestamp = new Date().toISOString()) => {
  return db.prepare('UPDATE patients SET caregiver_notified_at = ? WHERE id = ?').run(timestamp, patientId);
};

const resetCaregiverNotifiedAt = (patientId) => {
  return db.prepare('UPDATE patients SET caregiver_notified_at = NULL WHERE id = ?').run(patientId);
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  getPatientByPhoneNumber,
  updateCaregiverNotifiedAt,
  resetCaregiverNotifiedAt
};
