const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Generous limit for live dashboard polling
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/status-check',
  message: { error: 'Too many requests, please try again later.' }
});

const voiceWebhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests.' }
});

module.exports = {
  generalLimiter,
  voiceWebhookLimiter
};
