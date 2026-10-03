const db = require('../connection');

const getTemplatesByCategory = async (category) => {
  if (category) {
    return await db.prepare('SELECT * FROM instruction_templates WHERE category = ? ORDER BY id ASC').all(category);
  }
  return await db.prepare('SELECT * FROM instruction_templates ORDER BY category, id ASC').all();
};

const getTemplateById = async (id) => {
  return await db.prepare('SELECT * FROM instruction_templates WHERE id = ?').get(id);
};

module.exports = {
  getTemplatesByCategory,
  getTemplateById
};
