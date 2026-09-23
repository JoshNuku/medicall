const fs = require('fs');
const path = require('path');
const { query } = require('./connection');
const seedTemplates = require('./seedTemplates');
const seedDemoData = require('./seedDemoData');

const initDb = async () => {
  const schemaPath = path.join(__dirname, 'schema.pg.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await query(schemaSql);
  await seedTemplates();

  // Only seed demo patients in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoData();
    console.log('MediCall database schema initialized on Neon PostgreSQL and instruction templates + demo data seeded.');
  } else {
    console.log('MediCall database schema initialized on Neon PostgreSQL and instruction templates seeded. (Demo data skipped in production)');
  }
};

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = initDb;
