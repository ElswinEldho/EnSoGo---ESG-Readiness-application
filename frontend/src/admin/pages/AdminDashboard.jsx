/**
 * AdminDashboard — KPI cards, charts, and recent activity feed.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAdminAuth } from '../lib/adminAuth';
import { adminAnalyticsApi } from '../lib/adminApi';
import KpiCard from '../components/KpiCard';
import AdminBadge from '../components/AdminBadge';
import { useDarkMode } from '../components/AdminLayout';

function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#6366f1', '#ec4899'];

function ActivityFeed({ items, dark }) {
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const bg = dark ? '#1e293b' : '#ffffff';

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>Recent Admin Activity</div>
      </div>
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {items.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: subColor, fontSize: '13px' }}>
            No activity yet.
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '12px 20px',
            borderBottom: i < items.length - 1 ? `1px solid ${border}` : 'none',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '11px', fontWeight: 700,
            }}>
              {item.adminEmail?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: textColor, fontWeight: 500 }}>
                <span style={{ color: '#3b82f6' }}>{item.adminEmail || 'System'}</span>
                {' '}<span style={{ fontWeight: 400 }}>{formatAction(item.action)}</span>
                {item.resource && <span style={{ color: subColor }}> on {item.resource}</span>}
              </div>
              <div style={{ fontSize: '11px', color: subColor, marginTop: '2px' }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
            {item.success !== false ? (
              <span style={{ fontSize: '10px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '10px' }}>OK</span>
            ) : (
              <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '10px' }}>FAIL</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAction(action) {
  if (!action) return '';
  return action.toLowerCase().replace(/_/g, ' ');
}

export default function AdminDashboard() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [sectorDist, setSectorDist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      adminAnalyticsApi.dashboard(api),
      adminAnalyticsApi.userGrowth(api, 30),
      adminAnalyticsApi.assessmentsByStatus(api),
      adminAnalyticsApi.assessmentsBySector(api),
    ])
      .then(([dashRes, growthRes, statusRes, sectorRes]) => {
        if (!mounted) return;
        setStats(dashRes.data.data);
        setGrowth(growthRes.data.data);
        setStatusDist(statusRes.data.data);
        setSectorDist(sectorRes.data.data);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [api]);

  const kpis = stats?.kpis;
  const activity = stats?.recentActivity || [];

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const chartColor = dark ? '#334155' : '#e2e8f0';

  const kpiCards = [
    { title: 'Total Users', value: kpis?.totalUsers, subtitle: `${kpis?.activeUsers || 0} active`, icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={22} />, color: '#3b82f6', trend: null },
    { title: 'New Users (30d)', value: kpis?.newUsersLast30Days, subtitle: 'Registrations', icon: <Icon d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0M20 8v6M17 11h6" size={22} />, color: '#22c55e', trend: null },
    { title: 'Assessments', value: kpis?.totalAssessments, subtitle: `${kpis?.assessmentsLast30Days || 0} this month`, icon: <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" size={22} />, color: '#6366f1', trend: null },
    { title: 'Reports Generated', value: kpis?.totalReports, subtitle: `${kpis?.reportsLast30Days || 0} this month`, icon: <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" size={22} />, color: '#f59e0b', trend: null },
    { title: 'Total Uploads', value: kpis?.totalUploads, subtitle: 'All time', icon: <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" size={22} />, color: '#ec4899', trend: null },
    { title: 'Completed Assessments', value: kpis?.completedAssessments, subtitle: 'With readiness report', icon: <Icon d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" size={22} />, color: '#14b8a6', trend: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {kpiCards.map((k) => (
          <KpiCard key={k.title} {...k} loading={loading} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* User growth line chart */}
        <div style={{
          background: dark ? '#1e293b' : '#ffffff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>
            User Registrations (Last 30 Days)
          </div>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growth}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: subColor }} tickLine={false}
                       tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: subColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: `1px solid ${chartColor}`, borderRadius: '8px', fontSize: '12px', color: textColor }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subColor, fontSize: '13px' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Assessments by status pie */}
        <div style={{
          background: dark ? '#1e293b' : '#ffffff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>
            Assessments by Status
          </div>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: `1px solid ${chartColor}`, borderRadius: '8px', fontSize: '12px', color: textColor }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: subColor }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subColor, fontSize: '13px' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Assessments by sector bar */}
        <div style={{
          background: dark ? '#1e293b' : '#ffffff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>
            Top Sectors
          </div>
          {sectorDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectorDist} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: subColor }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: subColor }} width={80} />
                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: `1px solid ${chartColor}`, borderRadius: '8px', fontSize: '12px', color: textColor }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subColor, fontSize: '13px' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Activity feed */}
        <ActivityFeed items={activity} dark={dark} />
      </div>
    </div>
  );
}
