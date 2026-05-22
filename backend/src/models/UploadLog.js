const mongoose = require('mongoose');

const uploadLogSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', index: true, required: true },
    category: { type: String, required: true },
    fileName: { type: String, required: true },
    storedName: { type: String, required: true },
    size: { type: Number },
    // Uploaded = current data for this category
    // Replaced = a newer upload superseded this one; the file on disk has been
    //            removed but we keep the log row so the Recent Uploads section
    //            still shows the trail.
    status: { type: String, enum: ['Uploaded', 'Replaced', 'Processing', 'Error'], default: 'Uploaded' },
    monthsAdded: { type: [String], default: [] }, // "YYYY-MM"
    errorMessages: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ── Performance indexes ───────────────────────────────────────────────────────
// Most queries filter by assessment + status; this compound covers both.
uploadLogSchema.index({ assessment: 1, status: 1 });
// Compound for category-level operations (archive/purge by assessment+category)
uploadLogSchema.index({ assessment: 1, category: 1 });
// Recent uploads feed — sorted by createdAt descending
uploadLogSchema.index({ assessment: 1, createdAt: -1 });

module.exports = mongoose.model('UploadLog', uploadLogSchema);
