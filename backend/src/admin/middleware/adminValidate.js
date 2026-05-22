/**
 * adminValidate — reusable validation helpers for admin routes.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const { ADMIN_ROLES } = require('../models/AdminUser');

/**
 * Validates admin login request body.
 */
function validateAdminLogin(body) {
  const errors = {};
  if (!body.email || !EMAIL_RE.test(body.email)) errors.email = 'Valid email is required.';
  if (!body.password) errors.password = 'Password is required.';
  return errors;
}

/**
 * Validates admin user creation body.
 */
function validateAdminUserCreate(body) {
  const errors = {};
  if (!body.fullName || body.fullName.trim().length < 2)
    errors.fullName = 'Full name is required (min 2 chars).';
  if (!body.email || !EMAIL_RE.test(body.email))
    errors.email = 'Valid email is required.';
  if (!body.password || !PWD_RE.test(body.password))
    errors.password = 'Password must be ≥ 8 chars with 1 uppercase, 1 number, 1 symbol.';
  if (!body.role || !ADMIN_ROLES.includes(body.role))
    errors.role = `Role must be one of: ${ADMIN_ROLES.join(', ')}.`;
  return errors;
}

/**
 * Validates conversion factor update body.
 */
function validateConversionFactor(body) {
  const errors = {};
  if (!body.key || body.key.trim().length < 1) errors.key = 'Key is required.';
  if (!body.label || body.label.trim().length < 1) errors.label = 'Label is required.';
  if (body.value === undefined || body.value === null || !Number.isFinite(Number(body.value)))
    errors.value = 'Value must be a valid number.';
  if (!body.unit || body.unit.trim().length < 1) errors.unit = 'Unit is required.';
  return errors;
}

/**
 * Generic middleware — validates using a provided validator function.
 * @param {Function} validator (body) => errors object
 */
function validate(validator) {
  return (req, res, next) => {
    const errors = validator(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }
    next();
  };
}

module.exports = {
  validate,
  validateAdminLogin,
  validateAdminUserCreate,
  validateConversionFactor,
};
