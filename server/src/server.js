require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/db');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  await testConnection();

  app.listen(PORT, () => {
    logger.info(`ProPR API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
