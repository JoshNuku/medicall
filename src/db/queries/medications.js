const db = require('../connection');

const createMedication = ({
  patient_id,
  drug_name,
  instruction_source,
  dosage_template_id = null,
  frequency_template_id = null,
  timing_template_id = null,
  audio_url,
  schedule_times,
  duration_days,
  is_chronic = 0
}) => {
  const stmt = db.prepare(`
    INSERT INTO medications (
      patient_id, drug_name, instruction_source,
      dosage_template_id, frequency_template_id, timing_template_id,
      audio_url, schedule_times, duration_days, is_chronic
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    patient_id,
    drug_name,
    instruction_source,
    dosage_template_id,
    frequency_template_id,
    timing_template_id,
    audio_url,
    schedule_times,
    duration_days,
    is_chronic ? 1 : 0
  );

  return getMedicationById(info.lastInsertRowid);
};

const getMedicationsByPatientId = (patientId) => {
  return db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
};

const getMedicationById = (id) => {
  return db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
};

const getMedicationWithPatient = (id) => {
  return db.prepare(`
    SELECT m.*, p.phone_number, p.name AS patient_name, p.caregiver_phone, p.caregiver_notified_at
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    WHERE m.id = ?
  `).get(id);
};

module.exports = {
  createMedication,
  getMedicationsByPatientId,
  getMedicationById,
  getMedicationWithPatient
};
