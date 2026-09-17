require('dotenv').config();
const app = require('./app');
const initDb = require('./db/init');
const { startScheduler } = require('./services/cronScheduler');

const PORT = process.env.PORT || 3000;

// Ensure database schema and seed data are ready on boot
initDb();

// Start background medication adherence cron scheduler
startScheduler();

const server = app.listen(PORT, () => {
  console.log(`MediCall backend is running on port ${PORT}`);
  console.log(`Interactive API Documentation: http://localhost:${PORT}/api-docs`);
});

// MediCall Server reloaded with do_nothing tool & DTMF hangup guard
module.exports = server;
