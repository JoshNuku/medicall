require('dotenv').config();
const app = require('./app');
const initDb = require('./db/init');
const { startScheduler } = require('./services/cronScheduler');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Ensure database schema and seed data are ready on boot
    await initDb();

    // Start background medication adherence cron scheduler
    startScheduler();

    const server = app.listen(PORT, () => {
      console.log(`MediCall backend is running on port ${PORT}`);
      console.log(`Interactive API Documentation: http://localhost:${PORT}/api-docs`);
    });

    return server;
  } catch (err) {
    console.error('Failed to bootstrap server:', err);
    process.exit(1);
  }
}

const serverPromise = bootstrap();

module.exports = serverPromise;
