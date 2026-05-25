/**
 * UsersPage — manage platform users (search, filter, status change, delete).
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminUsersApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import AdminBadge from '../components/AdminBadge';
import ConfirmModal from '../components/ConfirmModal';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';
import { sectorName } from '../../lib/sectors.js';
import { formatDate } from '../../constants/index.js';

function Btn({ children, onClick, variant = 'default', disabled }) {
  const { dark } = useDarkMode();
  const variants = {
    default: { bg: dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', color: dark ? '#f1f5f9' : '#1e293b', border: dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' },
    danger: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
    success: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  };
  const s = variants[variant] || variants.default;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '5px 10px', borderRadius: '6px', border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '12px', fontWeight: 500, opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}

export default function UsersPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirm, setConfirm] = useState(null); // { type, user }
  const [actionLoading, setActionLoading] = useState(false);

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';

  const fetchUsers = useCallback(async (page = 1, q = search, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await adminUsersApi.list(api, { page, limit: 20, search: q, status });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      toast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, search, statusFilter, toast]);

  useEffect(() => { fetchUsers(1); }, []);

  const handleSearch = useCallback((q) => {
    setSearch(q);
    fetchUsers(1, q, statusFilter);
  }, [fetchUsers, statusFilter]);

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    fetchUsers(1, search, e.target.value);
  };

  const handleConfirmedAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'delete') {
        await adminUsersApi.delete(api, confirm.user._id);
        toast('User deleted successfully.', 'success');
      } else {
        await adminUsersApi.updateStatus(api, confirm.user._id, confirm.status);
        toast(`User ${confirm.status === 'Active' ? 'activated' : 'locked'}.`, 'success');
      }
      setConfirm(null);
      fetchUsers(pagination.page);
    } catch (err) {
      toast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: 'fullName', label: 'Name', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 500, color: textColor }}>{v}</div>
        <div style={{ fontSize: '11px', color: subColor }}>{row.email}</div>
      </div>
    )},
    { key: 'organizationName', label: 'Organization' },
    { key: 'sectorCode', label: 'Sector', render: (v) => sectorName(v) },
    { key: 'accountStatus', label: 'Status', width: '130px', render: (v) => <AdminBadge value={v} dark={dark} /> },
    { key: 'createdAt', label: 'Joined', width: '110px', render: (v) => formatDate(v) },
    { key: 'lastLoginAt', label: 'Last Login', width: '110px', render: (v) => v ? formatDate(v) : 'Never' },
    { key: '_actions', label: 'Actions', width: '160px', render: (_, row) => (
      <div style={{ display: 'flex', gap: '6px' }}>
        {row.accountStatus !== 'Active' && (
          <Btn variant="success" onClick={() => setConfirm({ type: 'status', user: row, status: 'Active' })}>Activate</Btn>
        )}
        {row.accountStatus === 'Active' && (
          <Btn variant="danger" onClick={() => setConfirm({ type: 'status', user: row, status: 'Locked' })}>Lock</Btn>
        )}
        <Btn variant="danger" onClick={() => setConfirm({ type: 'delete', user: row })}>Delete</Btn>
      </div>
    )},
  ];

  const filterEl = (
    <select value={statusFilter} onChange={handleStatusFilter}
      style={{
        padding: '7px 10px', borderRadius: '8px',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
        color: dark ? '#f1f5f9' : '#1e293b', fontSize: '13px',
      }}>
      <option value="">All Statuses</option>
      <option value="Active">Active</option>
      <option value="Locked">Locked</option>
      <option value="PendingVerification">Pending Verification</option>
    </select>
  );

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Platform Users</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>
          Manage user accounts across the EnSoGo platform.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        pagination={pagination}
        loading={loading}
        onPageChange={(p) => fetchUsers(p)}
        onSearch={handleSearch}
        searchPlaceholder="Search by name, email, or org..."
        filters={filterEl}
      />

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Delete User' : 'Change User Status'}
        message={
          confirm?.type === 'delete'
            ? `Permanently delete ${confirm?.user?.fullName} (${confirm?.user?.email}) and all their data? This cannot be undone.`
            : `Are you sure you want to ${confirm?.status === 'Active' ? 'activate' : 'lock'} ${confirm?.user?.fullName}?`
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete Permanently' : 'Confirm'}
        danger={confirm?.type === 'delete'}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirm(null)}
        loading={actionLoading}
      />
    </div>
  );
}
