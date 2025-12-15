/**
 * Simple structured logging utility
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
  },

  /**
   * Log error message
   */
  error: (msg: string, error?: Error | unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${msg}${errorMsg ? ': ' + errorMsg : ''}`);
  },

  /**
   * Log warning message
   */
  warn: (msg: string, data?: any) => {
    console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : '');
  },

  /**
   * Log success message
   */
  success: (msg: string, data?: any) => {
    console.log(`[SUCCESS] ✅ ${msg}`, data ? JSON.stringify(data) : '');
  },

  /**
   * Log debug message (only in debug mode)
   */
  debug: (msg: string, data?: any) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '');
    }
  }
};

