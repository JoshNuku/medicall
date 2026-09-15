const db = require('../connection');

const createEscalation = ({
  patient_id,
  diagnostic_response_id = null,
  escalation_type
}) => {
  const stmt = db.prepare(`
    INSERT INTO escalations (patient_id, diagnostic_response_id, escalation_type, status)
    VALUES (?, ?, ?, 'open')
  `);

  const info = stmt.run(patient_id, diagnostic_response_id, escalation_type);
  return getEscalationById(info.lastInsertRowid);
};

const getEscalationById = (id) => {
  return db.prepare('SELECT * FROM escalations WHERE id = ?').get(id);
};

const getOpenEscalationsWithPatient = () => {
  return db.prepare(`
    SELECT e.*, p.name AS patient_name, p.phone_number, p.caregiver_phone
    FROM escalations e
    JOIN patients p ON e.patient_id = p.id
    WHERE e.status = 'open'
    ORDER BY e.created_at DESC
  `).all();
};

const resolveEscalation = (id, resolved_by = 'pharmacist') => {
  const stmt = db.prepare(`
    UPDATE escalations
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
    WHERE id = ?
  `);
  stmt.run(resolved_by, id);
  return getEscalationById(id);
};

module.exports = {
  createEscalation,
  getEscalationById,
  getOpenEscalationsWithPatient,
  resolveEscalation
};
