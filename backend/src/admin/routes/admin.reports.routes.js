const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const { listReports, deleteReport, getReportStats } = require('../controllers/reportsController');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/stats', authorize('reports:read'), getReportStats);
router.get('/', authorize('reports:read'), listReports);
router.delete('/:id', authorize('reports:delete'), deleteReport);

module.exports = router;
