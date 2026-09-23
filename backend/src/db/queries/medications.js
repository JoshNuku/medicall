const db = require('../connection');

const createMedication = ({
  patient_id,
  drug_name,
  instruction_source,
  dosage_template_id = null,
  frequency_template_id = null,
  timing_template_id = null,
  audio_url,
  reminder_audio_url = null,
  schedule_times,
  duration_days,
  is_chronic = 0,
  language = 'twi'
}) => {
  const stmt = db.prepare(`
    INSERT INTO medications (
      patient_id, drug_name, instruction_source,
      dosage_template_id, frequency_template_id, timing_template_id,
      audio_url, reminder_audio_url, schedule_times, duration_days, is_chronic, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    patient_id,
    drug_name,
    instruction_source,
    dosage_template_id,
    frequency_template_id,
    timing_template_id,
    audio_url,
    reminder_audio_url,
    schedule_times,
    duration_days,
    is_chronic ? 1 : 0,
    language || 'twi'
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

const updateMedicationSchedule = (id, schedule_times) => {
  db.prepare('UPDATE medications SET schedule_times = ? WHERE id = ?').run(schedule_times, id);
  return getMedicationById(id);
};

const updateMedication = (id, fields) => {
  const allowed = ['drug_name', 'schedule_times', 'duration_days', 'is_chronic', 'audio_url', 'reminder_audio_url'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(key === 'is_chronic' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (updates.length === 0) return getMedicationById(id);
  values.push(id);
  db.prepare(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getMedicationById(id);
};

const deleteMedication = (id) => {
  const med = getMedicationById(id);
  if (!med) return null;
  db.prepare('DELETE FROM medications WHERE id = ?').run(id);
  return med;
};

module.exports = {
  createMedication,
  getMedicationsByPatientId,
  getMedicationById,
  getMedicationWithPatient,
  updateMedicationSchedule,
  updateMedication,
  deleteMedication
};
