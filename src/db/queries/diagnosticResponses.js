const db = require('../connection');

const createDiagnosticResponse = ({ call_event_id, patient_id, reason }) => {
  const stmt = db.prepare(`
    INSERT INTO diagnostic_responses (call_event_id, patient_id, reason)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(call_event_id, patient_id, reason);
  return getDiagnosticResponseById(info.lastInsertRowid);
};

const getDiagnosticResponseById = (id) => {
  return db.prepare('SELECT * FROM diagnostic_responses WHERE id = ?').get(id);
};

const getDiagnosticResponsesByPatientId = (patientId) => {
  return db.prepare(`
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
