const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { generalLimiter, voiceWebhookLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const healthRoutes = require('./routes/healthRoutes');
const { router: voiceRoutes, handleReminderCall, handleReminderConfirm } = require('./routes/voiceRoutes');
const voiceInboundRoutes = require('./routes/voiceInboundRoutes');
const voiceDiagnosticRoutes = require('./routes/voiceDiagnosticRoutes');
const patientEnrollRoutes = require('./routes/patientEnrollRoutes');
const patientRoutes = require('./routes/patientRoutes');
const patientLogRoutes = require('./routes/patientLogRoutes');
const medicationCreateRoutes = require('./routes/medicationCreateRoutes');
const medicationListRoutes = require('./routes/medicationListRoutes');
const medicationMutateRoutes = require('./routes/medicationMutateRoutes');
const templateRoutes = require('./routes/templateRoutes');
const alertRoutes = require('./routes/alertRoutes');
const callRoutes = require('./routes/callRoutes');

const app = express();

app.set('trust proxy', 1);

// CORS — allow Vercel frontend and local dev
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.some((allowed) => normalizedOrigin === allowed.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (audio recordings)
app.use(express.static(path.join(__dirname, '../public')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/status-check', generalLimiter, healthRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationCreateRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationListRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationMutateRoutes);
app.use('/patients/:id/logs', generalLimiter, patientLogRoutes);
app.use('/patients', generalLimiter, patientEnrollRoutes);
app.use('/patients', generalLimiter, patientRoutes);
app.use('/instruction-templates', generalLimiter, templateRoutes);
app.use('/alerts', generalLimiter, alertRoutes);
app.use('/calls', generalLimiter, callRoutes);

// Africa's Talking Voice Webhook Routes
app.use('/voice', voiceWebhookLimiter, voiceRoutes);
app.use('/voice', voiceWebhookLimiter, voiceInboundRoutes);
app.use('/voice', voiceWebhookLimiter, voiceDiagnosticRoutes);

// Fallback: If Africa's Talking dashboard callback is configured at root '/'
app.post('/', voiceWebhookLimiter, (req, res, next) => {
  if (req.body && (req.body.dtmfDigits !== undefined || req.query.dtmfDigits !== undefined)) {
    return handleReminderConfirm(req, res, next);
  }
  return handleReminderCall(req, res, next);
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
