const { Pool } = require('pg');
const logger = require('../utils/logger');

const useConnectionString = Boolean(process.env.DATABASE_URL);

const poolConfig = useConnectionString
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'propr',
    };

const pool = new Pool({
  ...poolConfig,
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err.message);
});

/**
 * Execute a parameterised SQL query using the shared connection pool.
 * @param {string} text SQL statement
 * @param {Array} [params] Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Verify that the database is reachable. Returns true/false and logs the
 * outcome instead of throwing so the server can still start in dev.
 */
async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    logger.info(`PostgreSQL connected (server time: ${rows[0].now.toISOString()})`);
    return true;
  } catch (err) {
    logger.warn(`PostgreSQL connection failed: ${err.message}`);
    return false;
  }
}

module.exports = { pool, query, testConnection };
