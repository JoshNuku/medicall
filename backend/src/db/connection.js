const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ [DATABASE]: DATABASE_URL is not set in environment!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('⚠️ [DATABASE POOL ERROR]:', err.message);
});

/**
 * Helper to run a parameterized query
 * @param {string} text - SQL statement with $1, $2 placeholders
 * @param {Array} params - Query arguments
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params = []) => {
  return pool.query(text, params);
};

/**
 * Helper to execute inside a single transactional client
 * @param {Function} callback - (client) => Promise<any>
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction
};
