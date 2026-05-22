/**
 * AuditLogsPage — immutable audit trail of all admin actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminAuditApi } from '../lib/adminApi';
import DataTable from '../components/DataTable';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

export default function AuditLogsPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [actionTypes, setActionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', resource: '', adminEmail: '' });

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const fetch = useCallback(async (page = 1, f = filters) => {
    setLoading(true);
    try {
      const res = await adminAuditApi.list(api, { page, limit: 50, ...f });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (_) {
      toast('Failed to load audit logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, filters, toast]);

  useEffect(() => {
    fetch(1);
    adminAuditApi.actionTypes(api).then((res) => setActionTypes(res.data.data)).catch(() => {});
  }, []);

  const selectStyle = {
    padding: '7px 10px', borderRadius: '8px', border: `1px solid ${border}`,
    background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px',
  };

  const filterEls = (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <select style={selectStyle} value={filters.action}
        onChange={(e) => { const f = { ...filters, action: e.target.value }; setFilters(f); fetch(1, f); }}>
        <option value="">All Actions</option>
        {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select style={selectStyle} value={filters.resource}
        onChange={(e) => { const f = { ...filters, resource: e.target.value }; setFilters(f); fetch(1, f); }}>
        <option value="">All Resources</option>
        {['User','AdminUser','Assessment','Report','ConversionFactor','SystemConfig'].map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  );

  const columns = [
    { key: 'createdAt', label: 'Time', width: '150px', render: (v) => (
      <span style={{ fontSize: '12px', color: subColor }}>{v ? new Date(v).toLocaleString() : '—'}</span>
    )},
    { key: 'adminEmail', label: 'Admin', width: '180px', render: (v) => (
      <span style={{ fontWeight: 500, color: '#3b82f6', fontSize: '13px' }}>{v || 'system'}</span>
    )},
    { key: 'adminRole', label: 'Role', width: '110px', render: (v) => (
      <span style={{ fontSize: '11px', color: subColor }}>{v || '—'}</span>
    )},
    { key: 'action', label: 'Action', render: (v) => (
      <code style={{ fontSize: '12px', background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: textColor }}>
        {v}
      </code>
    )},
    { key: 'resource', label: 'Resource', width: '130px' },
    { key: 'success', label: 'Result', width: '70px', render: (v) => (
      <span style={{ fontSize: '11px', fontWeight: 600, color: v !== false ? '#22c55e' : '#ef4444' }}>
        {v !== false ? 'OK' : 'FAIL'}
      </span>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Audit Logs</h1>
        <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>
          Immutable record of all administrative actions. Read-only.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={logs}
        pagination={pagination}
        loading={loading}
        onPageChange={(p) => fetch(p)}
        onSearch={(q) => { const f = { ...filters, search: q }; setFilters(f); fetch(1, f); }}
        searchPlaceholder="Search actions, resources..."
        filters={filterEls}
        emptyMessage="No audit logs found."
      />
    </div>
  );
}
