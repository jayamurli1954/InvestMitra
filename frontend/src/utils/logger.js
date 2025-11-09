/**
 * Logging utility for frontend
 * Replaces console.log statements with configurable logging
 * Can be disabled in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  error: (...args) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
    // In production, you could send errors to a logging service here
    // e.g., Sentry, LogRocket, etc.
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  }
};

export default logger;
