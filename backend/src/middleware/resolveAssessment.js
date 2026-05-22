/**
 * resolveAssessment middleware
 *
 * Accepts an EnSoGo ID (ENSOGO-XXXXXXXX) in the route param (`:id` or `:assessmentId`)
 * and resolves it to the corresponding MongoDB Assessment document, verifying ownership.
 *
 * Attaches `req.assessment` so downstream handlers never touch raw ObjectIDs.
 * The raw MongoDB `_id` remains internal — it is never returned to the client
 * unless explicitly included in a response field.
 */

const Assessment = require('../models/Assessment');
const { isEnsogoId } = require('../utils/ensogoId');
const AppError = require('./AppError');

/**
 * @param {string} [paramName='id']  The route param name that holds the EnSoGo ID.
 */
function resolveAssessment(paramName = 'id') {
  return async (req, res, next) => {
    try {
      const publicId = req.params[paramName];

      if (!publicId) {
        return next(new AppError('Assessment ID is required.', 400));
      }

      if (!isEnsogoId(publicId)) {
        return next(new AppError('Invalid assessment identifier format.', 400));
      }

      const doc = await Assessment.findOne({
        ensogoId: publicId,
        user: req.user._id,
      });

      if (!doc) {
        return next(new AppError('Assessment not found.', 404));
      }

      req.assessment = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = resolveAssessment;
