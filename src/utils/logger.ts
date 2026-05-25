/**
 * A utility for logging error and warning messages in development mode.
 */
const isDev: boolean = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]): void => {
    if (isDev) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },
};

export default logger;
