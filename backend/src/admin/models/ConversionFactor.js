/**
 * ConversionFactor model — DB-managed emission / conversion factors.
 * Replaces the hardcoded EMISSION_FACTORS in src/data/emissionFactors.js.
 * The ESG engine reads from this collection at runtime; changes are immediate.
 */

const mongoose = require('mongoose');

const conversionFactorSchema = new mongoose.Schema(
  {
    // Machine key matching the keys in the old EMISSION_FACTORS object
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Human-readable label
    label: { type: String, required: true, trim: true },

    // The actual numeric factor
    value: { type: Number, required: true },

    // Unit of measurement (e.g., 'kgCO2e/kWh', 'kgCO2e/litre')
    unit: { type: String, required: true, trim: true },

    // Source / basis reference
    basis: { type: String, trim: true },

    // Category for grouping in the UI
    category: {
      type: String,
      enum: ['electricity', 'fuel', 'refrigerant', 'waste', 'transport', 'water', 'other'],
      default: 'other',
      index: true,
    },

    // Whether this factor can be overridden per-assessment
    overridable: { type: Boolean, default: true },

    // Active / inactive toggle (instead of deleting)
    isActive: { type: Boolean, default: true, index: true },

    // Who last modified this
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    lastModifiedByEmail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConversionFactor', conversionFactorSchema);
