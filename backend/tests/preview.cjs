const fs = require('fs');
const path = require('path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-preview-secret-at-least-32-characters';
process.env.FRONTEND_URL = 'http://localhost:5174';
process.env.PORT = '5174';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.BREVO_API_KEY = '';
process.env.MAIL_FROM = '';
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../.cache/mongodb');
const shutdownFile = path.join(__dirname, '../.cache/stop-preview');
(async () => {
  fs.mkdirSync(path.dirname(shutdownFile), { recursive: true });
  if (fs.existsSync(shutdownFile)) fs.unlinkSync(shutdownFile);
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const db = await MongoMemoryServer.create();
  process.env.MONGO_URI = db.getUri();
  const server = await require('../server').start();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    server.closeAllConnections();
    await require('mongoose').disconnect();
    await db.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // Playwright's Windows process-tree termination can leave the child database alive.
  // A test-only file signal lets the owning process dispose of the database cleanly.
  setInterval(() => {
    if (fs.existsSync(shutdownFile)) stop();
  }, 250).unref();
})();
