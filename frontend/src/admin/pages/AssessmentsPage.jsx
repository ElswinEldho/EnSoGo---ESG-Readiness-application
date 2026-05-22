/**
 * AssessmentsPage — monitor ESG assessments across all users.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminAssessmentsApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import AdminBadge from '../components/AdminBadge';
import KpiCard from '../components/KpiCard';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';
import { sectorName } from '../../lib/sectors.js';

export default function AssessmentsPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [assessments, setAssessments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const fetch = useCallback(async (page = 1, q = search, status = statusFilter) => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminAssessmentsApi.list(api, { page, limit: 20, search: q, status }),
        page === 1 ? adminAssessmentsApi.stats(api) : Promise.resolve(null),
      ]);
      setAssessments(listRes.data.data);
      setPagination(listRes.data.pagination);
      if (statsRes) setStats(statsRes.data.data);
    } catch (_) {
      toast('Failed to load assessments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, search, statusFilter, toast]);

  useEffect(() => { fetch(1); }, []);

  const columns = [
    { key: 'organizationName', label: 'Organization', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 500, color: textColor }}>{v || row.user?.organizationName || '—'}</div>
        <div style={{ fontSize: '11px', color: subColor }}>{row.user?.email}</div>
      </div>
    )},
    { key: 'sectorCode', label: 'Sector', render: (v) => sectorName(v) },
    { key: 'status', label: 'Status', width: '130px', render: (v) => <AdminBadge value={v} dark={dark} /> },
    { key: 'createdAt', label: 'Created', width: '110px', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'updatedAt', label: 'Updated', width: '110px', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  const filterEl = (
    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetch(1, search, e.target.value); }}
      style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px' }}>
      <option value="">All Statuses</option>
      <option value="DataLoad">Data Load</option>
      <option value="SummaryReady">Summary Ready</option>
      <option value="ReadinessReady">Readiness Ready</option>
      <option value="Archived">Archived</option>
    </select>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>ESG Assessments</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>Monitor all ESG assessment activity across the platform.</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
          {[
            { title: 'Total', value: stats.total, color: '#3b82f6' },
            { title: 'In Progress', value: stats.dataLoad, color: '#f59e0b' },
            { title: 'Summary Ready', value: stats.summaryReady, color: '#6366f1' },
            { title: 'Readiness Ready', value: stats.readinessReady, color: '#22c55e' },
            { title: 'Archived', value: stats.archived, color: '#94a3b8' },
          ].map((k) => (
            <KpiCard key={k.title} title={k.title} value={k.value} color={k.color} />
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={assessments}
        pagination={pagination}
        loading={loading}
        onPageChange={(p) => fetch(p)}
        onSearch={(q) => { setSearch(q); fetch(1, q, statusFilter); }}
        searchPlaceholder="Search by organization..."
        filters={filterEl}
      />
    </div>
  );
}
