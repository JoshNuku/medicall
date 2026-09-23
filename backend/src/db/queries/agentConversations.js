const db = require('../connection');

const addConversationMessage = async ({ patient_id, role, content }) => {
  const res = await db.query(`
    INSERT INTO agent_conversations (patient_id, role, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [patient_id, role, content]);
  return res.rows[0];
};

const getConversationHistory = async (patientId, limit = 20) => {
  const res = await db.query(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = $1
    ORDER BY id ASC
    LIMIT $2
  `, [patientId, limit]);
  return res.rows;
};

const clearConversationHistory = async (patientId) => {
  return await db.query('DELETE FROM agent_conversations WHERE patient_id = $1', [patientId]);
};

const getLatestAssistantMessage = async (patientId) => {
  const res = await db.query(`
    SELECT id, patient_id, role, content, created_at
    FROM agent_conversations
    WHERE patient_id = $1 AND role = 'assistant'
    ORDER BY id DESC
    LIMIT 1
  `, [patientId]);
  return res.rows[0] || null;
};

module.exports = {
  addConversationMessage,
  getConversationHistory,
  getLatestAssistantMessage,
  clearConversationHistory
};
