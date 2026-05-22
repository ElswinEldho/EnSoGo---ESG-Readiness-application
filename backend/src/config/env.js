const path = require('path');
require('dotenv').config();

const env = process.env;

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-only-change-me') {
  // eslint-disable-next-line no-console
  console.warn('[WARN] JWT_SECRET is using the development default in production. Set JWT_SECRET in .env.');
}

// Resolve UPLOAD_DIR to an absolute path so it's immune to process.cwd() changes.
// Default: <repo>/backend/uploads — guaranteed outside the source tree.
env.UPLOAD_DIR = path.resolve(
  __dirname,       // backend/src/config
  '..', '..',      // -> backend/
  env.UPLOAD_DIR || 'uploads'
);

module.exports = env;
