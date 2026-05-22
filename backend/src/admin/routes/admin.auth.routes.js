const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { validate, validateAdminLogin } = require('../middleware/adminValidate');
const { login, getMe, logout } = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(validateAdminLogin), login);
router.get('/me', requireAdminAuth, getMe);
router.post('/logout', requireAdminAuth, logout);

module.exports = router;
