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
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const voiceSimulateRoutes = require('./routes/voiceSimulateRoutes');

const helmet = require('helmet');

const app = express();

app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (audio recordings)
app.use(express.static(path.join(__dirname, '../public')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/auth', generalLimiter, authRoutes);
app.use('/api/auth', generalLimiter, authRoutes);
app.use('/health', generalLimiter, healthRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationCreateRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationListRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationMutateRoutes);
app.use('/patients/:id/logs', generalLimiter, patientLogRoutes);
app.use('/patients', generalLimiter, patientEnrollRoutes);
app.use('/patients', generalLimiter, patientRoutes);
app.use('/instruction-templates', generalLimiter, templateRoutes);
app.use('/alerts', generalLimiter, alertRoutes);
app.use('/calls', generalLimiter, callRoutes);
app.use('/settings', generalLimiter, settingsRoutes);

// Africa's Talking Voice Webhook Routes
app.use('/voice', generalLimiter, voiceSimulateRoutes);
app.use('/voice', voiceWebhookLimiter, voiceRoutes);
app.use('/voice', voiceWebhookLimiter, voiceInboundRoutes);
app.use('/voice', voiceWebhookLimiter, voiceDiagnosticRoutes);

// Root endpoint for UptimeRobot, load balancers, and browser probes
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'MediCall API Backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    documentation: '/api-docs',
    health: '/health'
  });
});

app.head('/', (req, res) => {
  res.status(200).end();
});

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
