const crypto = require('crypto');
const db = require('../connection');

// Ensure users table exists in SQLite mode
if (!db.isPostgres) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Pharmacist',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
  } catch (_) {}
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  // Support plain text fallback for dev convenience if needed
  if (stored === password) return true;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt: Date.now()
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.AUTH_SECRET || 'medicall_secure_auth_secret_2026';
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const secret = process.env.AUTH_SECRET || 'medicall_secure_auth_secret_2026';
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function getUserByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?');
  return (await stmt.get(normalized)) || null;
}

async function getUserById(id) {
  if (!id) return null;
  const stmt = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?');
  return (await stmt.get(id)) || null;
}

async function createUser(email, password, name, role = 'Pharmacist') {
  const normalized = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);
  const stmt = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
  const info = await stmt.run(normalized, passwordHash, name, role);
  return {
    id: info.lastInsertRowid,
    email: normalized,
    name,
    role
  };
}

async function seedDefaultUsers() {
  const defaults = [
    {
      email: 'pharmacist@medicall.gh',
      password: 'password123',
      name: 'Dr. Kwame Mensah',
      role: 'Lead Clinical Pharmacist'
    },
    {
      email: 'nukujosh119@gmail.com',
      password: 'password123',
      name: 'Josh Nuku',
      role: 'Pharmacist Admin'
    },
    {
      email: 'admin@medicall.gh',
      password: 'medicall2026',
      name: 'MediCall Administrator',
      role: 'Clinical Operations'
    }
  ];

  for (const u of defaults) {
    try {
      const existing = await getUserByEmail(u.email);
      if (!existing) {
        await createUser(u.email, u.password, u.name, u.role);
      }
    } catch (_) {}
  }
}

// Seed on startup (non-blocking)
seedDefaultUsers().catch(() => {});

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserByEmail,
  getUserById,
  createUser,
  seedDefaultUsers
};
