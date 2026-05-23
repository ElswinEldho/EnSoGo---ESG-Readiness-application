/**
 * uploadDir — resolves UPLOAD_DIR to an absolute path from the backend root.
 *
 * Import this in any module that needs to read/write from the uploads folder.
 * process.env.UPLOAD_DIR is populated before this module loads because
 * dotenv.config() is called at the very top of server.js (the entry point).
 */

const path = require('path');

// Treat UPLOAD_DIR as relative to backend/ regardless of process.cwd().
// e.g. "./uploads" (from root .env) → <project>/backend/uploads (absolute)
const UPLOAD_DIR = path.resolve(
  __dirname,       // backend/src/config
  '..', '..',      // → backend/
  process.env.UPLOAD_DIR || 'uploads'
);

module.exports = UPLOAD_DIR;
