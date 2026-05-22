const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const { listAuditLogs, getActionTypes } = require('../controllers/auditLogsController');

const router = express.Router();
router.use(requireAdminAuth);
router.use(authorize('auditlogs:read'));

router.get('/action-types', getActionTypes);
router.get('/', listAuditLogs);

module.exports = router;
