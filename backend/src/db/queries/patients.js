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
  return db.prepare('SELECT id, phone_number, name, preferred_language, caregiver_phone, enrolled_at, consent_given FROM patients ORDER BY enrolled_at DESC').all();
};

const getPatientById = (id) => {
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
};

const getPatientByPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  const clean = normalizePhone(phoneNumber);
  const digitsOnly = clean.replace(/\D/g, '');

  const stmt = db.prepare(`
    SELECT * FROM patients 
    WHERE REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '+', '') = ?
       OR phone_number = ?
       OR phone_number = ?
  `);
  return stmt.get(digitsOnly, clean, phoneNumber);
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
