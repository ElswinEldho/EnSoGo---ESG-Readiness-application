const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    // Owner -- indexed so reports can be queried per-user without joining Assessment.
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true, index: true },
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    type: { type: String, enum: ['CalculationSummary', 'FullReadiness'], required: true },
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
    // Reports are permanently retained -- users can re-download after re-login.
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
