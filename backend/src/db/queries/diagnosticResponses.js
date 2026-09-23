const db = require('../connection');

const createDiagnosticResponse = async ({ call_event_id, patient_id, reason }) => {
  const res = await db.query(`
    INSERT INTO diagnostic_responses (call_event_id, patient_id, reason)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [call_event_id, patient_id, reason]);
  return res.rows[0];
};

const getDiagnosticResponseById = async (id) => {
  const res = await db.query('SELECT * FROM diagnostic_responses WHERE id = $1', [id]);
  return res.rows[0] || null;
};

const getDiagnosticResponsesByPatientId = async (patientId) => {
  const res = await db.query(`
    SELECT * FROM diagnostic_responses
    WHERE patient_id = $1
    ORDER BY responded_at DESC, id DESC
  `, [patientId]);
  return res.rows;
};

module.exports = {
  createDiagnosticResponse,
  getDiagnosticResponseById,
  getDiagnosticResponsesByPatientId
};
