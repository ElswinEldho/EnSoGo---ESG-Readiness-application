/**
 * ConversionFactorsPage — view and edit emission/conversion factors.
 * Edit access restricted to SUPER_ADMIN and ADMIN.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../lib/adminAuth';
import { adminConversionApi } from '../lib/adminApi';
import ConfirmModal from '../components/ConfirmModal';
import { useDarkMode } from '../components/AdminLayout';
import { useToast } from '../components/AdminToast';

const CATEGORIES = ['electricity', 'fuel', 'refrigerant', 'waste', 'transport', 'water', 'other'];

function EditModal({ factor, onSave, onClose, dark }) {
  const [form, setForm] = useState({
    label: factor?.label || '',
    value: factor?.value ?? '',
    unit: factor?.unit || '',
    basis: factor?.basis || '',
    category: factor?.category || 'other',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { api } = useAdminAuth();
  const toast = useToast();

  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const bg = dark ? '#0f172a' : '#ffffff';
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    color: textColor, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = 'Label is required.';
    if (form.value === '' || !Number.isFinite(Number(form.value))) e.value = 'Must be a valid number.';
    if (!form.unit.trim()) e.unit = 'Unit is required.';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (factor._id) {
        await adminConversionApi.update(api, factor._id, { ...form, value: Number(form.value) });
      } else {
        await adminConversionApi.create(api, { ...form, key: form.label.toLowerCase().replace(/\s+/g, '_'), value: Number(form.value) });
      }
      toast('Conversion factor saved. Changes take effect immediately.', 'success');
      onSave();
    } catch (err) {
      toast(err.response?.data?.error || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px' }}>
      <div style={{ background: bg, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}` }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>
          {factor._id ? 'Edit' : 'Create'} Conversion Factor
        </div>
        <div style={{ fontSize: '12px', color: subColor, marginBottom: '20px' }}>
          Changes reflect immediately in ESG calculations, reports, and analytics.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'label', label: 'Label', type: 'text', placeholder: 'e.g. Grid Electricity - India National' },
            { key: 'value', label: 'Value (numeric)', type: 'number', placeholder: 'e.g. 0.72' },
            { key: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. kgCO2e/kWh' },
            { key: 'basis', label: 'Basis / Source', type: 'text', placeholder: 'e.g. CEA India Grid Factor' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', color: subColor, marginBottom: '5px', fontWeight: 500 }}>{label}</label>
              <input type={type} step="any" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} style={inputStyle} />
              {errors[key] && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px' }}>{errors[key]}</div>}
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: subColor, marginBottom: '5px', fontWeight: 500 }}>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${border}`, background: 'transparent', color: textColor, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Factor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConversionFactorsPage() {
  const { api, admin } = useAdminAuth();
  const { dark } = useDarkMode();
  const toast = useToast();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editFactor, setEditFactor] = useState(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculateAll = async () => {
    if (!window.confirm('Recalculate all assessment summaries using current emission factors? This may take a moment.')) return;
    setRecalculating(true);
    try {
      const res = await adminConversionApi.recalculateAll(api);
      toast(`${res.data.message}`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Recalculation failed.', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  const canEdit = admin && ['SUPER_ADMIN', 'ADMIN'].includes(admin.role);

  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const headerBg = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const fetch = useCallback(async (cat = categoryFilter) => {
    setLoading(true);
    try {
      const res = await adminConversionApi.list(api, { category: cat });
      setFactors(res.data.data);
    } catch (_) {
      toast('Failed to load conversion factors.', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, categoryFilter, toast]);

  useEffect(() => { fetch(); }, []);

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await adminConversionApi.delete(api, deactivateConfirm._id);
      toast('Factor deactivated.', 'success');
      setDeactivateConfirm(null);
      fetch();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  // Group by category
  const grouped = factors.reduce((acc, f) => {
    const cat = f.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: textColor, margin: 0 }}>Emission & Conversion Factors</h1>
          <p style={{ fontSize: '13px', color: subColor, margin: '4px 0 0' }}>
            Changes take effect immediately in ESG calculations, scoring, and reports.
            {!canEdit && ' View-only access for your role.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); fetch(e.target.value); }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: textColor, fontSize: '13px' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
          </select>
          {canEdit && (
            <>
              <button
                onClick={handleRecalculateAll}
                disabled={recalculating}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${border}`, background: 'transparent', color: recalculating ? subColor : '#f59e0b', cursor: recalculating ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: recalculating ? 0.7 : 1 }}>
                {recalculating ? '⟳ Recalculating…' : '⟳ Recalculate All Assessments'}
              </button>
              <button onClick={() => setEditFactor({ label: '', value: '', unit: '', basis: '', category: 'other' })}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                + Add Factor
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning banner */}
      <div style={{
        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#d97706',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
      }}>
        <span>⚠</span>
        <span>
          Changes to emission factors immediately affect all new ESG calculations.
          Existing assessment summaries are automatically cleared and will recalculate with the new factors when users next open their summary.
          Use <strong>"⟳ Recalculate All Assessments"</strong> to proactively update all stored summaries now.
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: subColor }}>Loading factors…</div>
      ) : (
        Object.entries(grouped).map(([cat, catFactors]) => (
          <div key={cat} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: headerBg, borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: textColor, textTransform: 'capitalize' }}>{cat}</div>
              <div style={{ fontSize: '11px', color: subColor }}>{catFactors.length} factor(s)</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Label', 'Key', 'Value', 'Unit', 'Basis', ...(canEdit ? ['Actions'] : [])].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: subColor, borderBottom: `1px solid ${border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catFactors.map((f) => (
                  <tr key={f._id}>
                    <td style={{ padding: '12px 16px', color: textColor, fontWeight: 500 }}>{f.label}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: '11px', background: dark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: subColor }}>{f.key}</code>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 700, fontFamily: 'monospace' }}>{f.value}</td>
                    <td style={{ padding: '12px 16px', color: subColor }}>{f.unit}</td>
                    <td style={{ padding: '12px 16px', color: subColor, fontSize: '12px' }}>{f.basis || '—'}</td>
                    {canEdit && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditFactor(f)} style={{ border: 'none', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                          <button onClick={() => setDeactivateConfirm(f)} style={{ border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Deactivate</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {editFactor && (
        <EditModal
          factor={editFactor}
          dark={dark}
          onClose={() => setEditFactor(null)}
          onSave={() => { setEditFactor(null); fetch(); }}
        />
      )}

      <ConfirmModal
        open={!!deactivateConfirm}
        title="Deactivate Conversion Factor"
        message={`Deactivate "${deactivateConfirm?.label}"? The factor will no longer be used in new calculations.`}
        confirmLabel="Deactivate"
        danger
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateConfirm(null)}
        loading={deactivating}
      />
    </div>
  );
}
