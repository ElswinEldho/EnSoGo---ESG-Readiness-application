const mongoose = require('mongoose');
const { generateEnsogoId } = require('../utils/ensogoId');

const orgProfileSchema = new mongoose.Schema(
  {
    builtUpAreaSqft: { type: Number, min: 0 },
    employees: { type: Number, min: 0 },
    avgDailyOccupancy: { type: Number, min: 0 },
    operatingHoursPerDay: { type: Number, min: 0, max: 24 },
    numberOfFloors: { type: Number, min: 0 },
    yearEstablished: { type: Number, min: 1800, max: 2100 },
  },
  { _id: false }
);

const monthlyRecordSchema = new mongoose.Schema(
  {
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
    cost: { type: Number },
    meterOpening: { type: Number },
    meterClosing: { type: Number },
    peakDemandKva: { type: Number },
    powerFactor: { type: Number },
    source: { type: String },
    notes: { type: String },
    // Transport subcategories
    fleetFuel: { type: Number },  // fleet fuel consumption (litres)
    cargo: { type: Number },      // cargo transported (t-km)
    // Fuel subcategories
    pngCng: { type: Number },     // PNG / CNG consumption (m³)
  },
  { _id: false }
);

const governanceAnswersSchema = new mongoose.Schema(
  {
    sustainabilityPolicy: { type: Boolean, default: null },
    sustainabilityPolicyUploaded: { type: Boolean, default: null },
    esgOwner: { type: Boolean, default: null },
    esgOwnerFormallyAssigned: { type: Boolean, default: null },
    monthlyUtilityReview: { type: Boolean, default: null },
    monthlyUtilityReviewRecords: { type: Boolean, default: null },
    sopDocumentation: { type: String, enum: ['none', 'mentioned', 'uploaded'], default: 'none' },
    internalAuditsAny: { type: Boolean, default: null },
    internalAuditsWithin12Mo: { type: Boolean, default: null },
    complianceRegister: { type: Boolean, default: null },
    complianceRegisterUploaded: { type: Boolean, default: null },
    trainingConducted: { type: Boolean, default: null },
    trainingRecords: { type: Boolean, default: null },

    // Energy operational answers
    hvacEfficiency: { type: String, enum: ['modern', 'moderate', 'old', null], default: null },
    energyMonitoringSystem: { type: Boolean, default: null },
    ledCoveragePct: { type: Number, min: 0, max: 1 },

    // Water answers
    waterSourceCount: { type: Number, default: 0 },
    stpAvailable: { type: Boolean, default: null },
    stpOperational: { type: Boolean, default: null },
    leakageMonitoring: { type: Boolean, default: null },
    rainwaterHarvesting: { type: String, enum: ['none', 'present', 'operational'], default: 'none' },
    waterQualityTesting: { type: String, enum: ['none', 'conducted', 'reports'], default: 'none' },
    iaqMonitoring: { type: Boolean, default: null },

    // Waste answers
    wasteAllCategoriesTracked: { type: Boolean, default: null },
    wasteTotalTracked: { type: Boolean, default: null },
    segregationPct: { type: Number, min: 0, max: 1 },
    recyclingPct: { type: Number, min: 0, max: 1 },
    authorizedVendorCoverage: { type: Number, min: 0, max: 1, default: 0 },
    hazardousHandlingDocumented: { type: Boolean, default: null },
    wasteAuditRecords: { type: Boolean, default: null },

    // Hospital-specific
    cpcbVendor: { type: Boolean, default: null },
    biomedicalTracking: { type: Boolean, default: null },
    dailyBiomedicalDisposal: { type: Boolean, default: null },
    infectionControlSOPs: { type: Boolean, default: null },
    otAirQualityMonitoring: { type: Boolean, default: null },

    // Misc
    fssaiLicense: { type: Boolean, default: null },
    materialDeclarations: { type: Boolean, default: null },
    restrictedSubstanceTests: { type: Boolean, default: null },
    chemicalInventory: { type: Boolean, default: null },
    wastewaterTesting: { type: Boolean, default: null },
    capaTracking: { type: Boolean, default: null },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    /** Public-facing secure identifier — never expose raw _id in URLs */
    ensogoId: {
      type: String,
      unique: true,
      index: true,
      default: generateEnsogoId,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sectorCode: { type: String, required: true },
    organizationName: { type: String },
    status: {
      type: String,
      enum: ['DataLoad', 'SummaryReady', 'ReadinessReady', 'Archived'],
      default: 'DataLoad',
    },
    orgProfile: orgProfileSchema,
    governance: { type: governanceAnswersSchema, default: () => ({}) },
    records: {
      electricity: [monthlyRecordSchema],
      water: [monthlyRecordSchema],
      fuel: [monthlyRecordSchema],
      waste: [monthlyRecordSchema],
      transport: [monthlyRecordSchema],
      refrigerants: [monthlyRecordSchema],
    },
    extras: {
      renewableKwh: { type: Number, default: 0 },
      tankerKl: { type: Number, default: 0 },
      reusedKl: { type: Number, default: 0 },
      rainwaterKl: { type: Number, default: 0 },
      recycledKg: { type: Number, default: 0 },
      hazardousKg: { type: Number, default: 0 },
      biomedicalKg: { type: Number, default: 0 },
      authorizedVendorKg: { type: Number, default: 0 },
      ewasteKg: { type: Number, default: 0 },
      cargoTonneKm: { type: Number, default: 0 },
      wastewaterTreatedKl: { type: Number, default: 0 },
    },
    summary: { type: mongoose.Schema.Types.Mixed }, // last computed Screen 2 output
    readiness: { type: mongoose.Schema.Types.Mixed }, // last computed Screen 3 output
  },
  { timestamps: true }
);

// ── Performance indexes ───────────────────────────────────────────────────────
// Compound index: most queries filter by user + sort by updatedAt
assessmentSchema.index({ user: 1, updatedAt: -1 });
// Compound index: admin queries filter by status + sector
assessmentSchema.index({ status: 1, sectorCode: 1 });
// Compound index: public ID lookup — the primary route resolution path
assessmentSchema.index({ ensogoId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
