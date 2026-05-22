const express = require('express');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authorize, requireRole } = require('../middleware/adminAuthorize');
const { validate, validateConversionFactor } = require('../middleware/adminValidate');
const {
  listConversionFactors,
  getConversionFactor,
  createConversionFactor,
  updateConversionFactor,
  deleteConversionFactor,
  recalculateAllAssessments,
} = require('../controllers/conversionFactorsController');

const router = express.Router();
router.use(requireAdminAuth);

// All roles can read
router.get('/', authorize('conversionfactors:read'), listConversionFactors);
router.get('/:id', authorize('conversionfactors:read'), getConversionFactor);

// Only SUPER_ADMIN and ADMIN can write
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validate(validateConversionFactor), createConversionFactor);
router.put('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), updateConversionFactor);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteConversionFactor);

// Recalculate all assessment summaries with current factors (SUPER_ADMIN / ADMIN only)
router.post('/recalculate-all', requireRole('SUPER_ADMIN', 'ADMIN'), recalculateAllAssessments);

module.exports = router;
