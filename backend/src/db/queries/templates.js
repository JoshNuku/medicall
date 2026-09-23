const { query } = require('../connection');

const getTemplatesByCategory = async (category) => {
  if (category) {
    const res = await query('SELECT * FROM instruction_templates WHERE category = $1 ORDER BY id ASC', [category]);
    return res.rows;
  }
  const res = await query('SELECT * FROM instruction_templates ORDER BY category, id ASC');
  return res.rows;
};

const getTemplateById = async (id) => {
  const res = await query('SELECT * FROM instruction_templates WHERE id = $1', [id]);
  return res.rows[0] || null;
};

module.exports = {
  getTemplatesByCategory,
  getTemplateById
};
