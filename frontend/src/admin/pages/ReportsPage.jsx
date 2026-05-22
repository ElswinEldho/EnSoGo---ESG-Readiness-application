/**
 * ReportsPage — view and delete generated PDF reports.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminReportsApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import ConfirmModal from '../components/ConfirmModal';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

export default function ReportsPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminReportsApi.list(api, { page, limit: 20 });
      setReports(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      toast('Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { fetch(1); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminReportsApi.delete(api, deleteConfirm._id);
      toast('Report deleted.', 'success');
      setDeleteConfirm(null);
      fetch(pagination.page);
    } catch (err) {
      toast(err.response?.data?.error || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'type', label: 'Type', width: '140px', render: (v) => (
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{v || '—'}</span>
    )},
    { key: 'user', label: 'User', render: (v) => (
      <div>
        <div style={{ fontWeight: 500, color: textColor }}>{v?.fullName || '—'}</div>
        <div style={{ fontSize: '11px', color: subColor }}>{v?.email}</div>
      </div>
    )},
    { key: 'createdAt', label: 'Generated', width: '140px', render: (v) => v ? new Date(v).toLocaleString() : '—' },
    { key: '_actions', label: '', width: '80px', render: (_, row) => (
      <button onClick={() => setDeleteConfirm(row)} style={{
        border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
        padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
      }}>Delete</button>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Reports</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>Manage generated PDF reports on the platform.</p>
      </div>
      <DataTable columns={columns} data={reports} pagination={pagination} loading={loading} onPageChange={(p) => fetch(p)} emptyMessage="No reports found." />
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Report"
        message="Permanently delete this report? The PDF file will also be removed."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleting}
      />
    </div>
  );
}
