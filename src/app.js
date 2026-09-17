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
const templateRoutes = require('./routes/templateRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

app.set('trust proxy', 1);

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (audio recordings)
app.use(express.static(path.join(__dirname, '../public')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/health', generalLimiter, healthRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationCreateRoutes);
app.use('/patients/:id/medications', generalLimiter, medicationListRoutes);
app.use('/patients/:id/logs', generalLimiter, patientLogRoutes);
app.use('/patients', generalLimiter, patientEnrollRoutes);
app.use('/patients', generalLimiter, patientRoutes);
app.use('/instruction-templates', generalLimiter, templateRoutes);
app.use('/alerts', generalLimiter, alertRoutes);

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
