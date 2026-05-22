const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const {
  getDashboardStats,
  getUserGrowth,
  getAssessmentsByStatus,
  getAssessmentsBySector,
  getUploadActivity,
} = require('../controllers/analyticsController');

const router = express.Router();
router.use(requireAdminAuth);
router.use(authorize('analytics:read'));

router.get('/dashboard', getDashboardStats);
router.get('/user-growth', getUserGrowth);
router.get('/assessments-by-status', getAssessmentsByStatus);
router.get('/assessments-by-sector', getAssessmentsBySector);
router.get('/upload-activity', getUploadActivity);

module.exports = router;
