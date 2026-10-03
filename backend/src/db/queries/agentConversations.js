const db = require('../connection');

const addConversationMessage = async ({ patient_id, role, content }) => {
  const stmt = db.prepare(`
    INSERT INTO agent_conversations (patient_id, role, content)
    VALUES (?, ?, ?)
  `);
  const info = await stmt.run(patient_id, role, content);
  return { id: info.lastInsertRowid, patient_id, role, content };
};

const getConversationHistory = async (patientId, limit = 20) => {
  const stmt = db.prepare(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = ?
    ORDER BY id ASC
    LIMIT ?
  `);
  return await stmt.all(patientId, limit);
};

const clearConversationHistory = async (patientId) => {
  const stmt = db.prepare('DELETE FROM agent_conversations WHERE patient_id = ?');
  return await stmt.run(patientId);
};

const getLatestAssistantMessage = async (patientId) => {
  const stmt = db.prepare(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = ? AND role = 'assistant'
    ORDER BY id DESC
    LIMIT 1
  `);
  return await stmt.get(patientId);
};

module.exports = {
  addConversationMessage,
  getConversationHistory,
  getLatestAssistantMessage,
  clearConversationHistory
};
