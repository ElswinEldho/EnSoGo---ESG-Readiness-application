/**
 * Admin Seed Script
 * ─────────────────
 * Run once to bootstrap the database with:
 *   1. A SUPER_ADMIN admin user
 *   2. All emission/conversion factors (migrated from hardcoded emissionFactors.js)
 *   3. Default system configuration values
 *
 * Usage:
 *   node backend/src/admin/seed.js
 *
 * Environment variables (falls back to defaults if not set):
 *   ADMIN_SEED_EMAIL     — email for the first SUPER_ADMIN (default: admin@ensogo.com)
 *   ADMIN_SEED_PASSWORD  — password for the first SUPER_ADMIN (default: Admin@123!)
 *   MONGODB_URI          — MongoDB connection string
 */

// Only load backend/.env — the root .env uses JS syntax and breaks dotenv
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const AdminUser = require('./models/AdminUser');
const ConversionFactor = require('./models/ConversionFactor');
const SystemConfig = require('./models/SystemConfig');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sam-assessment';

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_ADMIN = {
  email: process.env.ADMIN_SEED_EMAIL || 'admin@ensogo.com',
  password: process.env.ADMIN_SEED_PASSWORD || 'Admin@123!',
  fullName: 'EnSoGo Super Admin',
  role: 'SUPER_ADMIN',
};

// Only factors that are actively consumed by the Scope 1 / 2 / 3 calculation
// engine (emissions.js + assessmentService.js buildSummary).
// Removed: petrol, lpg (never passed by buildSummary), gridElectricity_India_Master
// (mapped as gridMaster but computeScope2 only reads factors.grid).
const CONVERSION_FACTORS = [
  // ── Scope 2 ───────────────────────────────────────────────────────────────
  {
    key: 'gridElectricity_India_National',
    label: 'Grid Electricity — India National',
    value: 0.72,
    unit: 'kgCO2e/kWh',
    basis: 'CEA India Grid Factor',
    category: 'electricity',
    overridable: true,
  },
  // ── Scope 1 — Fuel combustion ─────────────────────────────────────────────
  {
    key: 'diesel',
    label: 'Diesel / HSD',
    value: 2.68,
    unit: 'kgCO2e/litre',
    basis: 'DEFRA / MoEFCC',
    category: 'fuel',
    overridable: true,
  },
  {
    key: 'pngCng',
    label: 'PNG / CNG',
    value: 2.04,
    unit: 'kgCO2e/kg',
    basis: 'DEFRA',
    category: 'fuel',
    overridable: true,
  },
  // ── Scope 1 — Refrigerant leakage ────────────────────────────────────────
  {
    key: 'refrigerant_R22',
    label: 'Refrigerant R-22',
    value: 1810,
    unit: 'kgCO2e/kg',
    basis: 'IPCC AR6 GWP',
    category: 'refrigerant',
    overridable: true,
  },
  {
    key: 'refrigerant_R410A',
    label: 'Refrigerant R-410A',
    value: 2088,
    unit: 'kgCO2e/kg',
    basis: 'IPCC AR6 GWP',
    category: 'refrigerant',
    overridable: true,
  },
  {
    key: 'refrigerant_R32',
    label: 'Refrigerant R-32',
    value: 675,
    unit: 'kgCO2e/kg',
    basis: 'IPCC AR6 GWP',
    category: 'refrigerant',
    overridable: true,
  },
  // ── Scope 3 ───────────────────────────────────────────────────────────────
  {
    key: 'wasteLandfill',
    label: 'Waste — Landfill',
    value: 0.46,
    unit: 'kgCO2e/kg',
    basis: 'DEFRA / IPCC',
    category: 'waste',
    overridable: true,
  },
  {
    key: 'wastewaterTreatment',
    label: 'Wastewater Treatment',
    value: 0.71,
    unit: 'kgCO2e/KL',
    basis: 'IPCC',
    category: 'water',
    overridable: true,
  },
  {
    key: 'roadFreight',
    label: 'Road Freight',
    value: 0.092,
    unit: 'kgCO2e/tonne-km',
    basis: 'GLEC Framework',
    category: 'transport',
    overridable: true,
  },
];

// Keys that were seeded in earlier versions but are no longer used anywhere
// in the calculation workflow. The seed will deactivate them on re-run so
// they disappear from the Admin Emission Factors page.
const OBSOLETE_FACTOR_KEYS = ['petrol', 'lpg', 'gridElectricity_India_Master'];

const SYSTEM_CONFIGS = [
  // Scoring
  { key: 'scoring.energyWeight', label: 'Energy Score Weight', value: 0.30, valueType: 'number', group: 'scoring', description: 'Weighting for energy category in overall ESG score (0–1).' },
  { key: 'scoring.waterWeight', label: 'Water Score Weight', value: 0.20, valueType: 'number', group: 'scoring', description: 'Weighting for water category in overall ESG score.' },
  { key: 'scoring.wasteWeight', label: 'Waste Score Weight', value: 0.20, valueType: 'number', group: 'scoring', description: 'Weighting for waste category in overall ESG score.' },
  { key: 'scoring.governanceWeight', label: 'Governance Score Weight', value: 0.30, valueType: 'number', group: 'scoring', description: 'Weighting for governance category in overall ESG score.' },
  // Annualization
  { key: 'annualization.minMonths', label: 'Min Months for Annualization', value: 6, valueType: 'number', group: 'annualization', description: 'Minimum months of data required to annualize.' },
  { key: 'annualization.scalingFactor', label: 'Default Annualization Scaling', value: 12, valueType: 'number', group: 'annualization', description: 'Months to scale to when annualizing partial data.' },
  // Benchmarking
  { key: 'benchmarking.enabled', label: 'Benchmarking Enabled', value: true, valueType: 'boolean', group: 'benchmarking', description: 'Enable/disable peer benchmarking in assessments.' },
  // Emissions
  { key: 'emissions.defaultGridFactor', label: 'Default Grid Factor Key', value: 'gridElectricity_India_National', valueType: 'string', group: 'emissions', description: 'Which conversion factor key to use as the default grid electricity factor.' },
  // Reports
  { key: 'reports.maxPdfSizeMb', label: 'Max PDF Size (MB)', value: 20, valueType: 'number', group: 'reports', description: 'Maximum allowed PDF report size in megabytes.' },
  { key: 'reports.retentionDays', label: 'Report Retention (Days)', value: 90, valueType: 'number', group: 'reports', description: 'How many days generated PDFs are kept before auto-deletion.' },
  // General
  { key: 'general.platformName', label: 'Platform Name', value: 'EnSoGo', valueType: 'string', group: 'general', description: 'Display name of the platform.' },
  { key: 'general.supportEmail', label: 'Support Email', value: 'support@ensogo.com', valueType: 'string', group: 'general', description: 'Support contact email shown in reports.' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('[seed] Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected.');

  // 1. Super Admin
  const existingAdmin = await AdminUser.findOne({ email: SEED_ADMIN.email });
  if (existingAdmin) {
    console.log(`[seed] SUPER_ADMIN already exists: ${SEED_ADMIN.email}`);
  } else {
    const admin = new AdminUser({
      fullName: SEED_ADMIN.fullName,
      email: SEED_ADMIN.email,
      role: 'SUPER_ADMIN',
    });
    await admin.setPassword(SEED_ADMIN.password);
    await admin.save();
    console.log(`[seed] ✓ Created SUPER_ADMIN: ${SEED_ADMIN.email}`);
    console.log(`[seed]   Password: ${SEED_ADMIN.password}  ← CHANGE THIS IN PRODUCTION`);
  }

  // 2. Conversion factors — only the 9 actively used by the calculation engine
  let createdFactors = 0;
  let skippedFactors = 0;
  for (const factor of CONVERSION_FACTORS) {
    const existing = await ConversionFactor.findOne({ key: factor.key });
    if (existing) {
      skippedFactors++;
      continue;
    }
    await ConversionFactor.create(factor);
    createdFactors++;
  }
  console.log(`[seed] ✓ Conversion factors: ${createdFactors} created, ${skippedFactors} already exist.`);

  // 2b. Deactivate any obsolete factors that may have been seeded by a previous
  //     version (petrol, lpg, gridElectricity_India_Master). Setting isActive=false
  //     removes them from the Admin UI and excludes them from getFactorsMap().
  let deactivatedFactors = 0;
  for (const key of OBSOLETE_FACTOR_KEYS) {
    const result = await ConversionFactor.updateOne({ key, isActive: true }, { $set: { isActive: false } });
    if (result.modifiedCount > 0) deactivatedFactors++;
  }
  if (deactivatedFactors > 0) {
    console.log(`[seed] ✓ Deactivated ${deactivatedFactors} obsolete factor(s): ${OBSOLETE_FACTOR_KEYS.join(', ')}.`);
  }

  // 3. System config
  let createdConfigs = 0;
  let skippedConfigs = 0;
  for (const config of SYSTEM_CONFIGS) {
    const existing = await SystemConfig.findOne({ key: config.key });
    if (existing) {
      skippedConfigs++;
      continue;
    }
    await SystemConfig.create(config);
    createdConfigs++;
  }
  console.log(`[seed] ✓ System configs: ${createdConfigs} created, ${skippedConfigs} already exist.`);

  console.log('[seed] ✓ Seed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
