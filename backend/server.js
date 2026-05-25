// SAM Assessment Application — Backend entry point.
// Loads the centralised root .env, spins up Express, connects MongoDB,
// and mounts the route tree.

// -- Environment -------------------------------------------------------------
// Must be the very first require so every module that follows sees process.env
// populated from the root .env file.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Warn loudly if the default dev secret reaches production.
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'dev-only-change-me') {
  // eslint-disable-next-line no-console
  console.warn('[WARN] JWT_SECRET is still set to the development default. Set a strong secret in .env before deploying.');
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const assessmentRoutes = require('./src/routes/assessment.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const reportRoutes = require('./src/routes/report.routes');
const adminRouter = require('./src/admin/adminRouter');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// --- core middleware --------------------------------------------------------
app.use(helmet());

// CORS_ORIGIN may be a comma-separated list of allowed origins (e.g. localhost + network IP).
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global rate-limit -- extra protection on auth handled inside the route file.
app.use(rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// --- routes -----------------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'sam-assessment-backend' }));
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRouter);

// 404 + error handler (must be last)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

// --- bootstrap --------------------------------------------------------------
async function start() {
  await connectDB();
  const port = process.env.PORT || 5000;
  const env = process.env.NODE_ENV || 'development';
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log('[sam] backend listening on http://localhost:' + port + ' (' + env + ')');
  });
}

if (require.main === module) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[sam] startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;
