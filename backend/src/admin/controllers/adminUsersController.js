/**
 * Admin Users Controller — manage admin panel users (AdminUser model).
 */

const AdminUser = require('../models/AdminUser');
const { ADMIN_ROLES } = require('../models/AdminUser');
const { createAuditEntry }               = require('../middleware/adminLogger');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

// GET /api/admin/admin-users
async function listAdminUsers(req, res, next) {
  try {
    const { search = '', role } = req.query;
    const { page, limit, skip, sort } = parsePaginationParams(req.query);

    const filter = {};
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ fullName: re }, { email: re }];
    }
    if (role && ADMIN_ROLES.includes(role)) filter.role = role;

    const [admins, total] = await Promise.all([
      AdminUser.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      AdminUser.countDocuments(filter),
    ]);

    // Remove password hashes from list
    const safeAdmins = admins.map(({ passwordHash, ...rest }) => rest);

    res.json(paginatedResponse(safeAdmins, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/admin-users
async function createAdminUser(req, res, next) {
  try {
    const { fullName, email, password, role, notes } = req.body;

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An admin with this email already exists.' });
    }

    // Only SUPER_ADMIN can create other SUPER_ADMIN or ADMIN accounts
    if (
      ['SUPER_ADMIN', 'ADMIN'].includes(role) &&
      req.adminUser.role !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        error: 'Only SUPER_ADMIN can create SUPER_ADMIN or ADMIN accounts.',
      });
    }

    const admin = new AdminUser({
      fullName: fullName.trim(),
      email:    email.toLowerCase().trim(),
      role,
      notes:     notes || '',
      createdBy: req.adminUser._id,
    });
    await admin.setPassword(password);
    await admin.save();

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'ADMIN_USER_CREATED',
      resource: 'AdminUser',
      resourceId: admin._id,
      after: { email: admin.email, role: admin.role },
      req,
    });

    res.status(201).json({ data: admin.toJSON(), message: 'Admin user created successfully.' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/admin-users/:id
async function updateAdminUser(req, res, next) {
  try {
    const admin = await AdminUser.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin user not found.' });

    // Cannot change your own role or deactivate yourself
    if (admin._id.toString() === req.adminUser._id.toString()) {
      if (req.body.role && req.body.role !== admin.role) {
        return res.status(400).json({ error: 'You cannot change your own role.' });
      }
      if (req.body.isActive === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own account.' });
      }
    }

    const before = { role: admin.role, isActive: admin.isActive };

    if (req.body.fullName) admin.fullName = req.body.fullName.trim();
    if (req.body.role && ADMIN_ROLES.includes(req.body.role)) {
      // Only SUPER_ADMIN can assign SUPER_ADMIN role
      if (req.body.role === 'SUPER_ADMIN' && req.adminUser.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can assign the SUPER_ADMIN role.' });
      }
      admin.role = req.body.role;
    }
    if (req.body.isActive !== undefined) admin.isActive = Boolean(req.body.isActive);
    if (req.body.notes !== undefined) admin.notes = req.body.notes;
    if (req.body.password) await admin.setPassword(req.body.password);
    await admin.save();

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'ADMIN_USER_UPDATED',
      resource: 'AdminUser',
      resourceId: admin._id,
      before,
      after: { role: admin.role, isActive: admin.isActive },
      req,
    });

    res.json({ data: admin.toJSON(), message: 'Admin user updated.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/admin-users/:id
async function deleteAdminUser(req, res, next) {
  try {
    const admin = await AdminUser.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin user not found.' });

    if (admin._id.toString() === req.adminUser._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    // Only SUPER_ADMIN can delete SUPER_ADMIN or ADMIN
    if (
      ['SUPER_ADMIN', 'ADMIN'].includes(admin.role) &&
      req.adminUser.role !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can delete SUPER_ADMIN or ADMIN accounts.' });
    }

    const before = { email: admin.email, role: admin.role };
    await AdminUser.findByIdAndDelete(admin._id);

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'ADMIN_USER_DELETED',
      resource: 'AdminUser',
      resourceId: admin._id,
      before,
      req,
    });

    res.json({ message: 'Admin user deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser };
