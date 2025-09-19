/**
 * Debug utility for conditional logging
 * Set DEBUG to false in production builds to disable all debug logs
 */

// Toggle this to false for production builds
const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Conditional console.log that only logs in development
 * @param {...any} args - Arguments to pass to console.log
 */
export const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};

/**
 * Conditional console.error that only logs in development
 * @param {...any} args - Arguments to pass to console.error
 */
export const debugError = (...args) => {
  if (DEBUG) {
    console.error(...args);
  }
};

/**
 * Conditional console.warn that only logs in development
 * @param {...any} args - Arguments to pass to console.warn
 */
export const debugWarn = (...args) => {
  if (DEBUG) {
    console.warn(...args);
  }
};

export default {
  log: debugLog,
  error: debugError,
  warn: debugWarn,
};
