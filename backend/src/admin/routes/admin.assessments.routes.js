const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const { listAssessments, getAssessment, getAssessmentStats } = require('../controllers/assessmentsController');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/stats', authorize('assessments:read'), getAssessmentStats);
router.get('/', authorize('assessments:read'), listAssessments);
router.get('/:id', authorize('assessments:read'), getAssessment);

module.exports = router;
