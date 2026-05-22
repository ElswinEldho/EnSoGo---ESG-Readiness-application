// SAM Assessment Application — Backend entry point.
// Spins up Express, connects MongoDB, and mounts the route tree.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./src/config/env');
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
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate-limit — extra protection on auth handled inside the route file.
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
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[sam] backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
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
