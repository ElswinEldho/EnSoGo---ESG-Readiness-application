/**
 * Centralized error handler — the last Express middleware in the chain.
 *
 * Handles five categories:
 *  1. AppError (operational)  — known errors with a clean message + status.
 *  2. Mongoose ValidationError — maps to 400 with per-field details.
 *  3. Mongoose duplicate key  — maps to 409 CONFLICT.
 *  4. Mongoose CastError      — invalid ObjectId → 400.
 *  5. JWT errors              — expired/invalid → 401.
 *  6. Multer size limit       — 413.
 *  7. Everything else         — 500, stack hidden in production.
 *
 * Response shape: { error: string, code?: string, fields?: object }
 */

const AppError = require('./AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // ── 1. Known operational errors ─────────────────────────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  // ── 2. Mongoose validation error ────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const fields = {};
    Object.values(err.errors).forEach((e) => { fields[e.path] = e.message; });
    return res.status(400).json({ error: 'Validation failed.', fields });
  }

  // ── 3. Mongoose duplicate key (E11000) ───────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `A record with this ${field} already exists.`, code: 'DUPLICATE_KEY' });
  }

  // ── 4. Mongoose bad ObjectID cast ────────────────────────────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid identifier format.', code: 'INVALID_ID' });
  }

  // ── 5. JWT errors ─────────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Unauthorized.', code: 'INVALID_TOKEN' });
  }

  // ── 6. Multer file-size limit ─────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.', code: 'FILE_TOO_LARGE' });
  }

  // ── 7. Unexpected / programming errors ───────────────────────────────────
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.error('[errorHandler]', err);
  }

  return res.status(500).json({
    error: isProd ? 'An unexpected error occurred. Please try again.' : err.message,
    ...(!isProd ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
