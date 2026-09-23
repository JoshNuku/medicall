const db = require('../connection');

const createEscalation = async ({
  patient_id,
  diagnostic_response_id = null,
  escalation_type,
  details = null
}) => {
  const res = await db.query(`
    INSERT INTO escalations (patient_id, diagnostic_response_id, escalation_type, status, details)
    VALUES ($1, $2, $3, 'open', $4)
    RETURNING *
  `, [patient_id, diagnostic_response_id, escalation_type, details]);

  return res.rows[0];
};

const getEscalationById = async (id) => {
  const res = await db.query('SELECT * FROM escalations WHERE id = $1', [id]);
  return res.rows[0] || null;
};

const getOpenEscalationsWithPatient = async () => {
  const res = await db.query(`
    SELECT e.*, p.name AS patient_name, p.phone_number, p.caregiver_phone
    FROM escalations e
    JOIN patients p ON e.patient_id = p.id
    WHERE e.status = 'open'
    ORDER BY e.created_at DESC
  `);
  return res.rows;
};

const resolveEscalation = async (id, resolved_by = 'pharmacist') => {
  const res = await db.query(`
    UPDATE escalations
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = $1
    WHERE id = $2
    RETURNING *
  `, [resolved_by, id]);
  return res.rows[0] || null;
};

module.exports = {
  createEscalation,
  getEscalationById,
  getOpenEscalationsWithPatient,
  resolveEscalation
};
