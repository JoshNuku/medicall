const db = require('../connection');

const createMedication = async ({
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
  const res = await db.query(`
    INSERT INTO medications (
      patient_id, drug_name, instruction_source,
      dosage_template_id, frequency_template_id, timing_template_id,
      audio_url, reminder_audio_url, schedule_times, duration_days, is_chronic, language
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
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
  ]);

  return res.rows[0];
};

const getMedicationsByPatientId = async (patientId) => {
  const res = await db.query(
    'SELECT * FROM medications WHERE patient_id = $1 ORDER BY created_at DESC',
    [patientId]
  );
  return res.rows;
};

const getMedicationById = async (id) => {
  const res = await db.query('SELECT * FROM medications WHERE id = $1', [id]);
  return res.rows[0] || null;
};

const getMedicationWithPatient = async (id) => {
  const res = await db.query(`
    SELECT m.*, p.phone_number, p.name AS patient_name, p.caregiver_phone, p.caregiver_notified_at
    FROM medications m
    JOIN patients p ON m.patient_id = p.id
    WHERE m.id = $1
  `, [id]);
  return res.rows[0] || null;
};

const updateMedicationSchedule = async (id, schedule_times) => {
  const res = await db.query(
    'UPDATE medications SET schedule_times = $1 WHERE id = $2 RETURNING *',
    [schedule_times, id]
  );
  return res.rows[0] || null;
};

const updateMedication = async (id, fields) => {
  const allowed = ['drug_name', 'schedule_times', 'duration_days', 'is_chronic', 'audio_url', 'reminder_audio_url'];
  const updates = [];
  const values = [];
  let paramIdx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${paramIdx++}`);
      values.push(key === 'is_chronic' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (updates.length === 0) return getMedicationById(id);
  values.push(id);
  const res = await db.query(
    `UPDATE medications SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    values
  );
  return res.rows[0] || null;
};

const deleteMedication = async (id) => {
  const res = await db.query('DELETE FROM medications WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
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
