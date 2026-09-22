const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/medicall.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Ensure compatibility with pragma and transaction
db.pragma = (sql) => db.exec(`PRAGMA ${sql};`);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  db.exec("ALTER TABLE medications ADD COLUMN language TEXT DEFAULT 'twi';");
} catch (_) {}

db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

module.exports = db;
