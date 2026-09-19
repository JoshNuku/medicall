const fs = require('fs');
const path = require('path');
const db = require('./connection');
const seedTemplates = require('./seedTemplates');
const seedDemoData = require('./seedDemoData');

const initDb = () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schemaSql);
  seedTemplates();
  seedDemoData();
  console.log('MediCall database schema initialized and instruction templates seeded.');
};

if (require.main === module) {
  initDb();
}

module.exports = initDb;
