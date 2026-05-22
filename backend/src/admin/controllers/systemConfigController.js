/**
 * System Configuration Controller.
 */

const SystemConfig = require('../models/SystemConfig');
const { createAuditEntry } = require('../middleware/adminLogger');

// GET /api/admin/system-config
async function listSystemConfig(req, res, next) {
  try {
    const { group } = req.query;
    const filter = { isActive: true };
    if (group) filter.group = group;

    const configs = await SystemConfig.find(filter).sort({ group: 1, key: 1 }).lean();
    res.json({ data: configs });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/system-config/:key — update by key
async function updateSystemConfig(req, res, next) {
  try {
    const config = await SystemConfig.findOne({ key: req.params.key });
    if (!config) return res.status(404).json({ error: 'Config key not found.' });
    if (config.isReadOnly) return res.status(403).json({ error: 'This configuration is read-only.' });

    const before = { value: config.value };
    config.value = req.body.value;
    config.lastModifiedBy = req.adminUser._id;
    config.lastModifiedByEmail = req.adminUser.email;
    await config.save();

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'SYSTEM_CONFIG_UPDATED',
      resource: 'SystemConfig',
      resourceId: config._id,
      before,
      after: { value: config.value },
      meta: { key: config.key },
      req,
    });

    res.json({ data: config, message: `Configuration "${config.key}" updated.` });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/system-config/:key — single config value (public read for engine)
async function getSystemConfig(req, res, next) {
  try {
    const config = await SystemConfig.findOne({ key: req.params.key, isActive: true }).lean();
    if (!config) return res.status(404).json({ error: 'Config not found.' });
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSystemConfig, updateSystemConfig, getSystemConfig };
