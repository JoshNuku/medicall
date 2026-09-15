const db = require('./connection');

const seedTemplates = () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM instruction_templates').get();
  if (row && row.count > 0) return;

  const insert = db.prepare(`
    INSERT INTO instruction_templates (category, label_english, text_twi, audio_url)
    VALUES (?, ?, ?, ?)
  `);

  const templates = [
    // Dosages (~8)
    ['dosage', '1 tablet', '[TWI: 1 tablet]', null],
    ['dosage', '2 tablets', '[TWI: 2 tablets]', null],
    ['dosage', 'half tablet', '[TWI: half tablet]', null],
    ['dosage', '1 capsule', '[TWI: 1 capsule]', null],
    ['dosage', '2 capsules', '[TWI: 2 capsules]', null],
    ['dosage', '5ml (1 teaspoon)', '[TWI: 5ml / 1 teaspoon]', null],
    ['dosage', '10ml (2 teaspoons)', '[TWI: 10ml / 2 teaspoons]', null],
    ['dosage', '15ml (1 tablespoon)', '[TWI: 15ml / 1 tablespoon]', null],

    // Frequencies (~5)
    ['frequency', 'Once daily', '[TWI: once daily]', null],
    ['frequency', 'Twice daily', '[TWI: twice daily]', null],
    ['frequency', 'Three times daily', '[TWI: three times daily]', null],
    ['frequency', 'Four times daily', '[TWI: four times daily]', null],
    ['frequency', 'Every other day', '[TWI: every other day]', null],

    // Timings (~4)
    ['timing', 'Before meals', '[TWI: before meals]', null],
    ['timing', 'After meals', '[TWI: after meals]', null],
    ['timing', 'With food', '[TWI: with food]', null],
    ['timing', 'At bedtime', '[TWI: at bedtime]', null]
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item[0], item[1], item[2], item[3]);
    }
  });

  insertMany(templates);
};

module.exports = seedTemplates;
