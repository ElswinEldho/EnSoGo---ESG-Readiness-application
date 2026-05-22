const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const { listUploads, getUploadStats } = require('../controllers/uploadsController');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/stats', authorize('uploads:read'), getUploadStats);
router.get('/', authorize('uploads:read'), listUploads);

module.exports = router;
