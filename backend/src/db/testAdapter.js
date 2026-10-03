const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const normalizeSql = (sql) => {
  let idx = 1;
  let pgSql = sql
    .replace(/\?/g, () => `$${idx++}`)
    .replace(/CAST\((.*?) AS FLOAT\)/gi, 'CAST($1 AS NUMERIC)')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/DATETIME/gi, 'TIMESTAMPTZ');

  if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
    pgSql += ' RETURNING id';
  }
  return pgSql;
};

const db = {
  isPostgres: true,
  pool,
  all: async (sql, params = []) => {
    const res = await pool.query(normalizeSql(sql), params);
    return res.rows;
  },
  get: async (sql, params = []) => {
    const res = await pool.query(normalizeSql(sql), params);
    return res.rows[0] || null;
  },
  run: async (sql, params = []) => {
    const res = await pool.query(normalizeSql(sql), params);
    return {
      rowCount: res.rowCount,
      lastInsertRowid: res.rows[0]?.id || null,
    };
  },
  prepare: (sql) => ({
    all: (...args) => db.all(sql, args),
    get: (...args) => db.get(sql, args),
    run: (...args) => db.run(sql, args),
  }),
};

async function runTests() {
  console.log('Testing db.prepare().all()...');
  const patients = await db.prepare('SELECT id, name, phone_number FROM patients ORDER BY id DESC').all();
  console.log(`✅ Found ${patients.length} patients in Neon:`, patients.map(p => `${p.name} (#${p.id})`));

  console.log('Testing db.prepare().get()...');
  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(30);
  console.log('✅ Patient #30:', patient?.name, patient?.phone_number);

  console.log('Testing db.prepare().run() with INSERT...');
  const testPhone = `+233${Math.floor(100000000 + Math.random() * 900000000)}`;
  const insertInfo = await db.prepare(`
    INSERT INTO patients (phone_number, name, preferred_language)
    VALUES (?, ?, ?)
  `).run(testPhone, 'Adapter Test Patient', 'twi');
  console.log('✅ Inserted new patient with ID:', insertInfo.lastInsertRowid);

  console.log('Cleaning up test patient...');
  await db.prepare('DELETE FROM patients WHERE id = ?').run(insertInfo.lastInsertRowid);
  console.log('✅ Test patient cleaned up.');

  await pool.end();
  console.log('🎉 ALL ADAPTER TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  pool.end();
});
