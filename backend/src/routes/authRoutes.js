const express = require('express');
const router = express.Router();
const {
  getUserByEmail,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserById
} = require('../db/queries/users');

/**
 * POST /login
 * Authenticates user by email and password.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email and password'
    });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  const token = generateToken(user);
  return res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

/**
 * GET /me
 * Returns current authenticated user information from token.
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token'
    });
  }

  const user = getUserById(payload.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User account not found'
    });
  }

  return res.status(200).json({
    success: true,
    user
  });
});

/**
 * POST /logout
 * Informs client to clear credentials.
 */
router.post('/logout', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
