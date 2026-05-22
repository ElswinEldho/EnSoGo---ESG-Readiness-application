const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize } = require('../middleware/adminAuthorize');
const {
  listUsers,
  getUser,
  updateUserStatus,
  deleteUser,
  getUserStats,
} = require('../controllers/usersController');

const router = express.Router();
router.use(requireAdminAuth);

router.get('/stats', authorize('users:read'), getUserStats);
router.get('/', authorize('users:read'), listUsers);
router.get('/:id', authorize('users:read'), getUser);
router.put('/:id/status', authorize('users:write'), updateUserStatus);
router.delete('/:id', authorize('users:delete'), deleteUser);

module.exports = router;
