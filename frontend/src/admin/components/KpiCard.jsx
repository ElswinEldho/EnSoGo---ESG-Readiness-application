/**
 * KpiCard — enterprise KPI card with trend indicator and icon.
 */

import { useDarkMode } from './AdminLayout';

export default function KpiCard({ title, value, subtitle, icon, trend, trendLabel, color = '#3b82f6', loading = false }) {
  const { dark } = useDarkMode();
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';

  const trendPositive = trend > 0;
  const trendColor = trend === 0 ? subColor : trendPositive ? '#22c55e' : '#ef4444';
  const trendArrow = trend === 0 ? '→' : trendPositive ? '↑' : '↓';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: '12px 12px 0 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: subColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </div>
          {loading ? (
            <div style={{ width: '80px', height: '28px', background: dark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', borderRadius: '6px', marginTop: '6px' }} />
          ) : (
            <div style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginTop: '4px', lineHeight: 1 }}>
              {value ?? '—'}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: '12px', color: subColor, marginTop: '4px' }}>{subtitle}</div>
          )}
        </div>
        {icon && (
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            background: color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
          <span style={{ color: trendColor, fontWeight: 600 }}>{trendArrow} {Math.abs(trend)}%</span>
          {trendLabel && <span style={{ color: subColor }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
