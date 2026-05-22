/**
 * AppError — typed operational error with HTTP status code.
 *
 * Operational errors (validation, not found, auth, etc.) extend this class.
 * The centralized errorHandler identifies these and returns clean JSON responses.
 * Unexpected errors (programming bugs, DB timeouts) fall through as 500s.
 */

class AppError extends Error {
  /**
   * @param {string} message   Human-readable error message
   * @param {number} statusCode HTTP status code (default 500)
   * @param {string} [code]    Optional machine-readable error code (e.g. 'NOT_FOUND')
   */
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // marks it as a known, handled error

    // Preserve the original stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = AppError;
