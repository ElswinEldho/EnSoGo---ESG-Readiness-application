const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize, requireRole } = require('../middleware/adminAuthorize');
const { listSystemConfig, updateSystemConfig, getSystemConfig } = require('../controllers/systemConfigController');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/', authorize('systemconfig:read'), listSystemConfig);
router.get('/:key', authorize('systemconfig:read'), getSystemConfig);
router.put('/:key', requireRole('SUPER_ADMIN', 'ADMIN'), updateSystemConfig);

module.exports = router;
