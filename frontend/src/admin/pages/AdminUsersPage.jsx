/**
 * AdminUsersPage — manage admin panel users (SUPER_ADMIN / ADMIN only).
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminAdminUsersApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import AdminBadge from '../components/AdminBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR', 'SUPPORT'];
const PWD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function AdminUsersPage() {
  const { api, admin: currentAdmin } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'SUPPORT', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const fetchAdmins = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAdminUsersApi.list(api, { page, limit: 20 });
      setAdmins(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      toast('Failed to load admin users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { fetchAdmins(1); }, []);

  const validateForm = () => {
    const errors = {};
    if (!form.fullName.trim() || form.fullName.length < 2) errors.fullName = 'Full name required.';
    if (!form.email.includes('@')) errors.email = 'Valid email required.';
    if (!PWD_RE.test(form.password)) errors.password = 'Password: ≥8 chars, 1 uppercase, 1 number, 1 symbol.';
    if (!ROLES.includes(form.role)) errors.role = 'Select a valid role.';
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      await adminAdminUsersApi.create(api, form);
      toast('Admin user created.', 'success');
      setShowForm(false);
      setForm({ fullName: '', email: '', password: '', role: 'SUPPORT', notes: '' });
      setFormErrors({});
      fetchAdmins(1);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create admin user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminAdminUsersApi.delete(api, deleteConfirm._id);
      toast('Admin user deleted.', 'success');
      setDeleteConfirm(null);
      fetchAdmins(1);
    } catch (err) {
      toast(err.response?.data?.error || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'fullName', label: 'Name', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 500, color: textColor }}>{v}</div>
        <div style={{ fontSize: '11px', color: subColor }}>{row.email}</div>
      </div>
    )},
    { key: 'role', label: 'Role', width: '140px', render: (v) => <AdminBadge value={v} dark={dark} /> },
    { key: 'isActive', label: 'Active', width: '80px', render: (v) => (
      <span style={{ color: v ? '#22c55e' : '#ef4444', fontSize: '12px', fontWeight: 600 }}>{v ? 'Yes' : 'No'}</span>
    )},
    { key: 'lastLoginAt', label: 'Last Login', width: '120px', render: (v) => v ? new Date(v).toLocaleDateString() : 'Never' },
    { key: 'createdAt', label: 'Created', width: '110px', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: '_actions', label: 'Actions', width: '80px', render: (_, row) => (
      row._id === currentAdmin?._id ? (
        <span style={{ fontSize: '11px', color: subColor }}>Current</span>
      ) : (
        <button onClick={() => setDeleteConfirm(row)} style={{
          border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
          padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
        }}>Delete</button>
      )
    )},
  ];

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    color: textColor, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  const createBtn = (
    <button onClick={() => setShowForm(true)} style={{
      padding: '8px 16px', borderRadius: '8px', border: 'none',
      background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    }}>+ New Admin User</button>
  );

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Admin Panel Users</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>
          Manage who has access to this admin panel and their roles.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        pagination={pagination}
        loading={loading}
        onPageChange={(p) => fetchAdmins(p)}
        actions={createBtn}
      />

      {/* Create form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div style={{ background: bg, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}` }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: textColor, marginBottom: '20px' }}>Create Admin User</div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'fullName', label: 'Full Name', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'password', label: 'Password', type: 'password' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '12px', color: subColor, marginBottom: '5px', fontWeight: 500 }}>{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  {formErrors[key] && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px' }}>{formErrors[key]}</div>}
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: subColor, marginBottom: '5px', fontWeight: 500 }}>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); }} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${border}`, background: 'transparent', color: textColor, cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Admin User"
        message={`Delete admin account for ${deleteConfirm?.fullName} (${deleteConfirm?.email})? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
