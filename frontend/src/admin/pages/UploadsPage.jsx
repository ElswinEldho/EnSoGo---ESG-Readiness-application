/**
 * UploadsPage — monitor file upload activity.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminUploadsApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

export default function UploadsPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [uploads, setUploads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const fetch = useCallback(async (page = 1, category = categoryFilter) => {
    setLoading(true);
    try {
      const res = await adminUploadsApi.list(api, { page, limit: 20, category });
      setUploads(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      toast('Failed to load uploads.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, categoryFilter, toast]);

  useEffect(() => { fetch(1); }, []);

  const columns = [
    { key: 'category', label: 'Category', width: '130px', render: (v) => (
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
        background: '#3b82f620', color: '#3b82f6', textTransform: 'capitalize',
      }}>{v || '—'}</span>
    )},
    { key: 'assessment', label: 'Organization', render: (v) => v?.organizationName || '—' },
    { key: 'createdAt', label: 'Uploaded', width: '160px', render: (v) => v ? new Date(v).toLocaleString() : '—' },
  ];

  const filterEl = (
    <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); fetch(1, e.target.value); }}
      style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px' }}>
      <option value="">All Categories</option>
      {['electricity','water','fuel','waste','transport','refrigerants'].map((c) => (
        <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
      ))}
    </select>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Upload Monitoring</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>Track all file uploads across the platform.</p>
      </div>
      <DataTable
        columns={columns}
        data={uploads}
        pagination={pagination}
        loading={loading}
        onPageChange={(p) => fetch(p)}
        filters={filterEl}
        emptyMessage="No uploads found."
      />
    </div>
  );
}
