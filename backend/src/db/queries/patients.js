const { query, transaction } = require('../connection');
const normalizePhone = (p) => (p ? String(p).replace(/[\s\-\(\)]/g, '') : '');

const createPatient = async ({ phone_number, name, preferred_language = 'twi', caregiver_phone = null, consent_given = 1 }) => {
  const cleanPhone = normalizePhone(phone_number);
  const cleanCaregiver = caregiver_phone ? normalizePhone(caregiver_phone) : null;
  const res = await query(
    `INSERT INTO patients (phone_number, name, preferred_language, caregiver_phone, consent_given)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone_number) DO UPDATE
     SET name = EXCLUDED.name,
         preferred_language = EXCLUDED.preferred_language,
         caregiver_phone = COALESCE(EXCLUDED.caregiver_phone, patients.caregiver_phone),
         consent_given = EXCLUDED.consent_given
     RETURNING id`,
    [cleanPhone, name.trim(), preferred_language, cleanCaregiver, consent_given ? 1 : 0]
  );
  return getPatientById(res.rows[0].id);
};

const getAllPatients = async () => {
  const res = await query(`
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
      COALESCE(stats.total_calls, 0)::int AS total_calls,
      COALESCE(stats.confirmed_calls, 0)::int AS confirmed_calls,
      stats.adherence_rate::int AS adherence_rate
    FROM patients p
    LEFT JOIN call_events latest_call ON latest_call.id = (
      SELECT id FROM call_events 
      WHERE patient_id = p.id AND (outcome IS NOT NULL OR actual_call_time IS NOT NULL)
      ORDER BY COALESCE(actual_call_time, scheduled_time) DESC, id DESC 
      LIMIT 1
    )
    LEFT JOIN (
      SELECT 
        patient_id,
        COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END) AS total_calls,
        COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS confirmed_calls,
        ROUND(CAST(COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS NUMERIC) * 100.0 / NULLIF(COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END), 0)) AS adherence_rate
      FROM call_events
      GROUP BY patient_id
    ) stats ON p.id = stats.patient_id
    ORDER BY p.enrolled_at DESC
  `);
  return res.rows;
};

const getPatientById = async (id) => {
  const res = await query(`
    SELECT 
      p.*,
      latest_call.actual_call_time AS last_call_time,
      latest_call.scheduled_time AS last_scheduled_time,
      latest_call.outcome AS last_call_outcome,
      COALESCE(stats.total_calls, 0)::int AS total_calls,
      COALESCE(stats.confirmed_calls, 0)::int AS confirmed_calls,
      stats.adherence_rate::int AS adherence_rate
    FROM patients p
    LEFT JOIN call_events latest_call ON latest_call.id = (
      SELECT id FROM call_events 
      WHERE patient_id = p.id AND (outcome IS NOT NULL OR actual_call_time IS NOT NULL)
      ORDER BY COALESCE(actual_call_time, scheduled_time) DESC, id DESC 
      LIMIT 1
    )
    LEFT JOIN (
      SELECT 
        patient_id,
        COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END) AS total_calls,
        COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS confirmed_calls,
        ROUND(CAST(COUNT(CASE WHEN outcome = 'confirmed' THEN 1 END) AS NUMERIC) * 100.0 / NULLIF(COUNT(CASE WHEN outcome IN ('confirmed', 'not_taken', 'no_answer', 'answered_no_keypress') THEN 1 END), 0)) AS adherence_rate
      FROM call_events
      GROUP BY patient_id
    ) stats ON p.id = stats.patient_id
    WHERE p.id = $1
  `, [id]);
  return res.rows[0] || null;
};

const getPatientByPhoneNumber = async (phoneNumber) => {
  if (!phoneNumber) return null;
  const clean = normalizePhone(phoneNumber);
  const digitsOnly = clean.replace(/\D/g, '');
  const last9 = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;

  const res = await query(`
    SELECT 
      p.*,
      latest_call.actual_call_time AS last_call_time,
      latest_call.scheduled_time AS last_scheduled_time,
      latest_call.outcome AS last_call_outcome
    FROM patients p
    LEFT JOIN call_events latest_call ON latest_call.id = (
      SELECT id FROM call_events 
      WHERE patient_id = p.id AND (outcome IS NOT NULL OR actual_call_time IS NOT NULL)
      ORDER BY COALESCE(actual_call_time, scheduled_time) DESC, id DESC 
      LIMIT 1
    )
    WHERE REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g') = $1
       OR p.phone_number = $2
       OR p.phone_number = $3
       OR ($4 != '' AND RIGHT(REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g'), 9) = $4)
    LIMIT 1
  `, [digitsOnly, clean, phoneNumber, last9]);
  return res.rows[0] || null;
};

const updateCaregiverNotifiedAt = async (patientId, timestamp = new Date().toISOString()) => {
  const res = await query('UPDATE patients SET caregiver_notified_at = $1 WHERE id = $2 RETURNING *', [timestamp, patientId]);
  return res.rows[0];
};

const resetCaregiverNotifiedAt = async (patientId) => {
  const res = await query('UPDATE patients SET caregiver_notified_at = NULL WHERE id = $1 RETURNING *', [patientId]);
  return res.rows[0];
};

const updatePatient = async (id, fields = {}) => {
  const patient = await getPatientById(id);
  if (!patient) return null;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (fields.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(fields.name.trim());
  }
  if (fields.phone_number !== undefined) {
    updates.push(`phone_number = $${paramIndex++}`);
    values.push(normalizePhone(fields.phone_number));
  }
  if (fields.preferred_language !== undefined) {
    updates.push(`preferred_language = $${paramIndex++}`);
    values.push(fields.preferred_language);
  }
  if (fields.caregiver_phone !== undefined) {
    updates.push(`caregiver_phone = $${paramIndex++}`);
    values.push(fields.caregiver_phone ? normalizePhone(fields.caregiver_phone) : null);
  }
  if (fields.consent_given !== undefined) {
    updates.push(`consent_given = $${paramIndex++}`);
    values.push(fields.consent_given ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(`UPDATE patients SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
  }

  return getPatientById(id);
};

const deletePatient = async (id) => {
  const patient = await getPatientById(id);
  if (!patient) return null;

  await transaction(async (client) => {
    await client.query('DELETE FROM agent_conversations WHERE patient_id = $1', [id]);
    await client.query('DELETE FROM escalations WHERE patient_id = $1', [id]);
    await client.query('DELETE FROM diagnostic_responses WHERE patient_id = $1', [id]);
    await client.query('DELETE FROM call_events WHERE patient_id = $1', [id]);
    await client.query('DELETE FROM medications WHERE patient_id = $1', [id]);
    await client.query('DELETE FROM patients WHERE id = $1', [id]);
  });

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
