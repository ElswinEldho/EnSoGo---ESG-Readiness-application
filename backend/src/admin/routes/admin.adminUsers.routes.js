const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { requireRole } = require('../middleware/adminAuthorize');
const { validate, validateAdminUserCreate } = require('../middleware/adminValidate');
const {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} = require('../controllers/adminUsersController');

const router = express.Router();
router.use(requireAdminAuth);
// Only SUPER_ADMIN and ADMIN can manage admin panel users
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/', listAdminUsers);
router.post('/', validate(validateAdminUserCreate), createAdminUser);
router.put('/:id', updateAdminUser);
router.delete('/:id', deleteAdminUser);

module.exports = router;
