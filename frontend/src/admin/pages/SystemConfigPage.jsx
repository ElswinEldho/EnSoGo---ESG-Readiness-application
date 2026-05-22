/**
 * SystemConfigPage — view and edit system-wide configuration.
 * Edit access restricted to SUPER_ADMIN and ADMIN.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminConfigApi } from '../lib/adminApi';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

const GROUP_LABELS = {
  scoring: 'Scoring',
  annualization: 'Annualization',
  benchmarking: 'Benchmarking',
  emissions: 'Emissions',
  reports: 'Reports',
  general: 'General',
};

function ConfigRow({ config, canEdit, dark, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);
  const { api } = useAdminAuth();
  const toast = useToast();

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const startEdit = () => {
    setVal(typeof config.value === 'object' ? JSON.stringify(config.value, null, 2) : String(config.value));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let parsed = val;
      if (config.valueType === 'number') parsed = Number(val);
      else if (config.valueType === 'boolean') parsed = val === 'true';
      else if (config.valueType === 'json') parsed = JSON.parse(val);
      await adminConfigApi.update(api, config.key, parsed);
      toast(`"${config.key}" updated.`, 'success');
      setEditing(false);
      onSave();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
        <div style={{ fontWeight: 600, color: textColor, fontSize: '13px' }}>{config.label}</div>
        <code style={{ fontSize: '11px', color: subColor }}>{config.key}</code>
        {config.description && <div style={{ fontSize: '11px', color: subColor, marginTop: '2px' }}>{config.description}</div>}
      </td>
      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
        {editing ? (
          config.valueType === 'boolean' ? (
            <select value={val} onChange={(e) => setVal(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px' }}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : config.valueType === 'json' ? (
            <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={4}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          ) : (
            <input type={config.valueType === 'number' ? 'number' : 'text'} step="any" value={val}
              onChange={(e) => setVal(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px', outline: 'none', width: '200px' }} />
          )
        ) : (
          <span style={{ fontFamily: config.valueType === 'json' ? 'monospace' : 'inherit', fontSize: '13px', color: textColor }}>
            {typeof config.value === 'object' ? JSON.stringify(config.value) : String(config.value)}
          </span>
        )}
      </td>
      <td style={{ padding: '14px 16px', width: '80px', verticalAlign: 'top' }}>
        <span style={{ fontSize: '11px', color: subColor, background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
          {config.valueType}
        </span>
      </td>
      {canEdit && !config.isReadOnly && (
        <td style={{ padding: '14px 16px', verticalAlign: 'top', width: '120px' }}>
          {editing ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleSave} disabled={saving} style={{ border: 'none', background: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? '...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} style={{ border: `1px solid ${border}`, background: 'transparent', color: textColor, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={startEdit} style={{ border: 'none', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              Edit
            </button>
          )}
        </td>
      )}
      {canEdit && config.isReadOnly && (
        <td style={{ padding: '14px 16px', width: '120px', verticalAlign: 'top' }}>
          <span style={{ fontSize: '11px', color: subColor }}>Read-only</span>
        </td>
      )}
    </tr>
  );
}

export default function SystemConfigPage() {
  const { api, admin } = useAdminAuth();
  const { dark } = useDarkMode();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('');

  const canEdit = admin && ['SUPER_ADMIN', 'ADMIN'].includes(admin.role);
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const headerBg = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const fetch = useCallback(async (group = groupFilter) => {
    setLoading(true);
    try {
      const res = await adminConfigApi.list(api, { group });
      setConfigs(res.data.data);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  }, [api, groupFilter]);

  useEffect(() => { fetch(); }, []);

  const grouped = configs.reduce((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group].push(c);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>System Configuration</h1>
          <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>
            Manage system-wide settings. Changes to scoring / calculation configs affect all future assessments.
          </p>
        </div>
        <select value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); fetch(e.target.value); }}
          style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px' }}>
          <option value="">All Groups</option>
          {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: subColor }}>Loading…</div>
      ) : configs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: subColor, background: bg, border: `1px solid ${border}`, borderRadius: '12px' }}>
          No configuration entries found. Run the seed script to initialize defaults.
        </div>
      ) : (
        Object.entries(grouped).map(([group, groupConfigs]) => (
          <div key={group} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: headerBg, borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>{GROUP_LABELS[group] || group}</div>
              <div style={{ fontSize: '11px', color: subColor }}>{groupConfigs.length} setting(s)</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Setting', 'Current Value', 'Type', ...(canEdit ? ['Actions'] : [])].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: subColor, borderBottom: `1px solid ${border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupConfigs.map((c) => (
                  <ConfigRow key={c.key} config={c} canEdit={canEdit} dark={dark} onSave={() => fetch(groupFilter)} />
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
