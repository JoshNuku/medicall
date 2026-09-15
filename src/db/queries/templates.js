const db = require('../connection');

const getTemplatesByCategory = (category) => {
  if (category) {
    return db.prepare('SELECT * FROM instruction_templates WHERE category = ? ORDER BY id ASC').all(category);
  }
  return db.prepare('SELECT * FROM instruction_templates ORDER BY category, id ASC').all();
};

const getTemplateById = (id) => {
  return db.prepare('SELECT * FROM instruction_templates WHERE id = ?').get(id);
};

module.exports = {
  getTemplatesByCategory,
  getTemplateById
};
