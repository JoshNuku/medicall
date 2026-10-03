require('dotenv').config();
const { query } = require('../src/db/connection');

async function migrate() {
  try {
    console.log('Migrating diagnostic_responses check constraint on Neon PostgreSQL...');
    await query('ALTER TABLE diagnostic_responses DROP CONSTRAINT IF EXISTS diagnostic_responses_reason_check');
    await query("ALTER TABLE diagnostic_responses ADD CONSTRAINT diagnostic_responses_reason_check CHECK (reason IN ('cost', 'side_effects', 'felt_better', 'forgot', 'other'))");
    console.log('Migration successful: "felt_better" added to diagnostic_responses!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
