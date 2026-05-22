/**
 * AnalyticsPage — full analytics view with all charts.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAdminAuth } from '../lib/adminAuth';
import { adminAnalyticsApi } from '../lib/adminApi';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

export default function AnalyticsPage() {
  const { api } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [growth, setGrowth] = useState([]);
  const [sector, setSector] = useState([]);
  const [uploadActivity, setUploadActivity] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const gridColor = dark ? '#334155' : '#e2e8f0';

  const tooltipStyle = { background: dark ? '#0f172a' : '#fff', border: `1px solid ${border}`, borderRadius: '8px', fontSize: '12px', color: textColor };

  const fetch = async (d = days) => {
    setLoading(true);
    try {
      const [g, s, u] = await Promise.all([
        adminAnalyticsApi.userGrowth(api, d),
        adminAnalyticsApi.assessmentsBySector(api),
        adminAnalyticsApi.uploadActivity(api, 14),
      ]);
      setGrowth(g.data.data);
      setSector(s.data.data);
      // Simplify upload activity
      const byDay = {};
      for (const r of u.data.data) {
        const date = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
        byDay[date] = (byDay[date] || 0) + r.count;
      }
      setUploadActivity(Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (_) {
      toast('Failed to load analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const ChartCard = ({ title, subtitle, children }) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: textColor }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: subColor, marginTop: '2px' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>Platform usage and growth metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[7, 14, 30, 60, 90].map((d) => (
            <button key={d} onClick={() => { setDays(d); fetch(d); }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: days === d ? '#3b82f6' : 'transparent', color: days === d ? '#fff' : textColor, cursor: 'pointer', fontSize: '12px', fontWeight: days === d ? 600 : 400 }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ChartCard title={`User Registrations (Last ${days} Days)`} subtitle="Daily new user sign-ups">
          {loading ? <div style={{ height: '220px', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: '8px' }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growth}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: subColor }} tickLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: subColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Assessments by Sector" subtitle="Top 10 sectors by assessment count">
          {loading ? <div style={{ height: '220px', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: '8px' }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sector} layout="vertical">
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: subColor }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: subColor }} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Assessments" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Upload Activity (Last 14 Days)" subtitle="Files uploaded per day across all categories">
          {loading ? <div style={{ height: '220px', background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: '8px' }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={uploadActivity}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: subColor }} tickLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: subColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Uploads" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
