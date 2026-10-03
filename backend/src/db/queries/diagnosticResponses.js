const db = require('../connection');

const createDiagnosticResponse = async ({ call_event_id, patient_id, reason }) => {
  const stmt = db.prepare(`
    INSERT INTO diagnostic_responses (call_event_id, patient_id, reason)
    VALUES (?, ?, ?)
  `);
  const info = await stmt.run(call_event_id, patient_id, reason);
  return await getDiagnosticResponseById(info.lastInsertRowid);
};

const getDiagnosticResponseById = async (id) => {
  return await db.prepare('SELECT * FROM diagnostic_responses WHERE id = ?').get(id);
};

const getDiagnosticResponsesByPatientId = async (patientId) => {
  return await db.prepare(`
    SELECT * FROM diagnostic_responses
    WHERE patient_id = ?
    ORDER BY responded_at DESC, id DESC
  `).all(patientId);
};

module.exports = {
  createDiagnosticResponse,
  getDiagnosticResponseById,
  getDiagnosticResponsesByPatientId
};
