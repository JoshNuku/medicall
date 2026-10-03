const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const templates = [
  ['dosage', '1 tablet', 'Fa baa baako', null],
  ['dosage', '2 tablets', 'Fa mmaa mmienu', null],
  ['dosage', 'half tablet', 'Fa fā', null],
  ['dosage', '1 capsule', 'Fa kotokuo baako', null],
  ['dosage', '2 capsules', 'Fa kotokuo mmienu', null],
  ['dosage', '5ml (1 teaspoon)', 'Nomi atere ketewa baako (5ml)', null],
  ['dosage', '10ml (2 teaspoons)', 'Nomi atere nketewa mmienu (10ml)', null],
  ['dosage', '15ml (1 tablespoon)', 'Nomi atere kɛseɛ baako (15ml)', null],

  ['frequency', 'Once daily', 'da biara pɛnkoro', null],
  ['frequency', 'Twice daily', 'da biara mprenu (anɔpa ne anwummerɛ)', null],
  ['frequency', 'Three times daily', 'da biara mprɛnsa (anɔpa, awia, ne anwummerɛ)', null],
  ['frequency', 'Four times daily', 'da biara mprɛnan', null],
  ['frequency', 'Every other day', 'da a ɛto so mmienu biara', null],

  ['timing', 'Before meals', 'ansa na woadidi', null],
  ['timing', 'After meals', 'sɛ wodidi wie a', null],
  ['timing', 'With food', 'bere a woregu so redidi', null],
  ['timing', 'At bedtime', 'ansa na wobɛkɔ akɔda', null]
];

async function seedNeon() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*) as count FROM instruction_templates');
    if (parseInt(res.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding instruction templates into Neon...');
      for (const item of templates) {
        await client.query(
          'INSERT INTO instruction_templates (category, label_english, text_twi, audio_url) VALUES ($1, $2, $3, $4)',
          item
        );
      }
      console.log(`✅ Seeded ${templates.length} instruction templates!`);
    } else {
      console.log(`ℹ️ Instruction templates already seeded (${res.rows[0].count} rows).`);
    }

    // Seed default pharmacist user if not exists
    const userRes = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('pharmacist@medicall.care', 'hash_default', 'Dr. Kwame Mensah', 'Lead Pharmacist')
      `);
      console.log('✅ Seeded default pharmacist user!');
    }
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedNeon();
