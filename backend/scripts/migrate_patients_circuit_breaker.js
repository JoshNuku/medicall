require('dotenv').config();
const { query } = require('../src/db/connection');

async function migrate() {
  try {
    console.log('Running circuit breaker migration on database...');
    await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0');
    await query("ALTER TABLE patients ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
    console.log('✓ Migration complete: consecutive_failures and status columns verified on patients table!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
