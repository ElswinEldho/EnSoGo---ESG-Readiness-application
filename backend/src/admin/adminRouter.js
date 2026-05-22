/**
 * adminRouter — assembles all /api/admin/* routes.
 * Mount this in server.js:  app.use('/api/admin', adminRouter)
 */

const express = require('express');

const authRoutes           = require('./routes/admin.auth.routes');
const usersRoutes          = require('./routes/admin.users.routes');
const adminUsersRoutes     = require('./routes/admin.adminUsers.routes');
const assessmentsRoutes    = require('./routes/admin.assessments.routes');
const uploadsRoutes        = require('./routes/admin.uploads.routes');
const reportsRoutes        = require('./routes/admin.reports.routes');
const analyticsRoutes      = require('./routes/admin.analytics.routes');
const auditLogsRoutes      = require('./routes/admin.auditLogs.routes');
const conversionFactRoutes = require('./routes/admin.conversionFactors.routes');
const systemConfigRoutes   = require('./routes/admin.systemConfig.routes');

const router = express.Router();

router.use('/auth',               authRoutes);
router.use('/users',              usersRoutes);
router.use('/admin-users',        adminUsersRoutes);
router.use('/assessments',        assessmentsRoutes);
router.use('/uploads',            uploadsRoutes);
router.use('/reports',            reportsRoutes);
router.use('/analytics',          analyticsRoutes);
router.use('/audit-logs',         auditLogsRoutes);
router.use('/conversion-factors', conversionFactRoutes);
router.use('/system-config',      systemConfigRoutes);

module.exports = router;
