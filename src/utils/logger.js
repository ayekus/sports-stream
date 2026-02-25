/**
 * Logger utility to manage console output
 * Only logs in development mode to keep production console clean
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // We always log errors, even in production, but we can format them here
    console.error(...args);
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  }
};
