const db = require('../connection');

const addConversationMessage = ({ patient_id, role, content }) => {
  const stmt = db.prepare(`
    INSERT INTO agent_conversations (patient_id, role, content)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(patient_id, role, content);
  return { id: info.lastInsertRowid, patient_id, role, content };
};

const getConversationHistory = (patientId, limit = 20) => {
  const stmt = db.prepare(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = ?
    ORDER BY id ASC
    LIMIT ?
  `);
  return stmt.all(patientId, limit);
};

const clearConversationHistory = (patientId) => {
  const stmt = db.prepare('DELETE FROM agent_conversations WHERE patient_id = ?');
  return stmt.run(patientId);
};

const getLatestAssistantMessage = (patientId) => {
  const stmt = db.prepare(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = ? AND role = 'assistant'
    ORDER BY id DESC
    LIMIT 1
  `);
  return stmt.get(patientId);
};

module.exports = {
  addConversationMessage,
  getConversationHistory,
  getLatestAssistantMessage,
  clearConversationHistory
};
