/**
 * Minimal logger used across the backend. Keeps the API surface small while
 * making it easy to swap in a more advanced logger (pino/winston) later.
 */
const levels = ['info', 'warn', 'error', 'debug'];

function format(level, message) {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
}

const logger = levels.reduce((acc, level) => {
  acc[level] = (...args) => {
    const message = args
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join(' ');
    /* eslint-disable no-console */
    const stream = level === 'error' || level === 'warn' ? console.error : console.log;
    stream(format(level, message));
    /* eslint-enable no-console */
  };
  return acc;
}, {});

module.exports = logger;
