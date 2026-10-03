const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isPostgres = Boolean(
  connectionString &&
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'))
);

// Initialize SQLite fallback mirror for 100% offline resilience
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/medicall.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new DatabaseSync(dbPath);
sqlite.pragma = (sql) => sqlite.exec(`PRAGMA ${sql};`);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

let db = {};

if (isPostgres) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.warn('⚠️ [Postgres Pool warning]:', err.message);
  });

  console.log('🐘 [Database]: Connected to Neon PostgreSQL (Production Online)');

  const normalizePgSql = (sql) => {
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

  const isNetworkError = (err) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    const code = (err.code || '').toLowerCase();
    return (
      code === 'enotfound' ||
      code === 'econnrefused' ||
      code === 'etimedout' ||
      msg.includes('connection terminated') ||
      msg.includes('connection timeout') ||
      msg.includes('timeout') ||
      msg.includes('getaddrinfo')
    );
  };

  db = {
    isPostgres: true,
    pool,
    sqlite,
    query: async (sql, params = []) => {
      try {
        return await pool.query(normalizePgSql(sql), params);
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn(`⚠️ [Offline Fallback]: Neon unreachable (${err.message}). Serving from SQLite.`);
          const stmt = sqlite.prepare(sql);
          return { rows: stmt.all(...params) };
        }
        throw err;
      }
    },
    all: async (sql, params = []) => {
      try {
        const res = await pool.query(normalizePgSql(sql), params);
        return res.rows;
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn(`⚠️ [Offline Fallback]: Neon unreachable (${err.message}). Serving .all() from SQLite.`);
          return sqlite.prepare(sql).all(...params);
        }
        throw err;
      }
    },
    get: async (sql, params = []) => {
      try {
        const res = await pool.query(normalizePgSql(sql), params);
        return res.rows[0] || null;
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn(`⚠️ [Offline Fallback]: Neon unreachable (${err.message}). Serving .get() from SQLite.`);
          return sqlite.prepare(sql).get(...params) || null;
        }
        throw err;
      }
    },
    run: async (sql, params = []) => {
      try {
        const res = await pool.query(normalizePgSql(sql), params);
        return {
          rowCount: res.rowCount,
          lastInsertRowid: res.rows[0]?.id || null,
        };
      } catch (err) {
        if (isNetworkError(err)) {
          console.warn(`⚠️ [Offline Fallback]: Neon unreachable (${err.message}). Serving .run() from SQLite.`);
          const info = sqlite.prepare(sql).run(...params);
          return {
            rowCount: info.changes,
            lastInsertRowid: info.lastInsertRowid,
          };
        }
        throw err;
      }
    },
    exec: async (sql) => {
      try {
        return await pool.query(normalizePgSql(sql));
      } catch (err) {
        if (isNetworkError(err)) {
          return sqlite.exec(sql);
        }
        throw err;
      }
    },
    pragma: () => {}, // No-op for PostgreSQL
    prepare: (sql) => ({
      all: (...args) => db.all(sql, args),
      get: (...args) => db.get(sql, args),
      run: (...args) => db.run(sql, args),
    }),
    transaction: (fn) => async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client, ...args);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
} else {
  // Pure SQLite mode
  db = sqlite;
  db.isPostgres = false;
  console.log('📁 [Database]: Connected to local SQLite file');
}

module.exports = db;
