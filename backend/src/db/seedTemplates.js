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
    ['dosage', '1 tablet', 'Fa baa baako', null],
    ['dosage', '2 tablets', 'Fa mmaa mmienu', null],
    ['dosage', 'half tablet', 'Fa fā', null],
    ['dosage', '1 capsule', 'Fa kotokuo baako', null],
    ['dosage', '2 capsules', 'Fa kotokuo mmienu', null],
    ['dosage', '5ml (1 teaspoon)', 'Nomi atere ketewa baako (5ml)', null],
    ['dosage', '10ml (2 teaspoons)', 'Nomi atere nketewa mmienu (10ml)', null],
    ['dosage', '15ml (1 tablespoon)', 'Nomi atere kɛseɛ baako (15ml)', null],

    // Frequencies (~5)
    ['frequency', 'Once daily', 'da biara pɛnkoro', null],
    ['frequency', 'Twice daily', 'da biara mprenu (anɔpa ne anwummerɛ)', null],
    ['frequency', 'Three times daily', 'da biara mprɛnsa (anɔpa, awia, ne anwummerɛ)', null],
    ['frequency', 'Four times daily', 'da biara mprɛnan', null],
    ['frequency', 'Every other day', 'da a ɛto so mmienu biara', null],

    // Timings (~4)
    ['timing', 'Before meals', 'ansa na woadidi', null],
    ['timing', 'After meals', 'sɛ wodidi wie a', null],
    ['timing', 'With food', 'bere a woregu so redidi', null],
    ['timing', 'At bedtime', 'ansa na wobɛkɔ akɔda', null]
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item[0], item[1], item[2], item[3]);
    }
  });

  insertMany(templates);
};

module.exports = seedTemplates;
