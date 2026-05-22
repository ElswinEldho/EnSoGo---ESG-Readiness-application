/**
 * SystemConfig model — key/value store for system-wide configuration.
 * Examples: scoring weights, annualization defaults, benchmark thresholds.
 */

const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // The config value — can be number, string, boolean, or object
    value: { type: mongoose.Schema.Types.Mixed, required: true },

    // For UI rendering
    valueType: {
      type: String,
      enum: ['number', 'string', 'boolean', 'json'],
      default: 'string',
    },

    // Grouping for display
    group: {
      type: String,
      enum: ['scoring', 'annualization', 'benchmarking', 'emissions', 'reports', 'general'],
      default: 'general',
      index: true,
    },

    isActive: { type: Boolean, default: true },
    isReadOnly: { type: Boolean, default: false }, // cannot be edited from UI

    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    lastModifiedByEmail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
