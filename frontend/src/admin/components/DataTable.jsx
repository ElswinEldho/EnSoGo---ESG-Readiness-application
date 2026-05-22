/**
 * DataTable — reusable paginated table with search, filter, sort.
 */

import { useState } from 'react';
import { useDarkMode } from './AdminLayout';

export default function DataTable({
  columns,
  data = [],
  pagination,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  loading = false,
  actions,
  emptyMessage = 'No records found.',
  filters,
}) {
  const { dark } = useDarkMode();
  const [search, setSearch] = useState('');

  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
  const headerBg = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const rowHover = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const handleSearch = (e) => {
    setSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Toolbar */}
      {(onSearch || filters || actions) && (
        <div style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          {onSearch && (
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: `1px solid ${border}`,
                background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: textColor,
                fontSize: '13px',
                outline: 'none',
                width: '220px',
              }}
            />
          )}
          {filters}
          <div style={{ marginLeft: 'auto' }}>{actions}</div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: headerBg }}>
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: '10px 16px',
                  textAlign: col.align || 'left',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: subColor,
                  borderBottom: `1px solid ${border}`,
                  whiteSpace: 'nowrap',
                  width: col.width,
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
                      <div style={{
                        height: '14px',
                        background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
                        borderRadius: '4px',
                        width: `${40 + Math.random() * 40}%`,
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: subColor }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row._id || idx}
                  style={{
                    borderBottom: idx < data.length - 1 ? `1px solid ${border}` : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = rowHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{
                      padding: '12px 16px',
                      color: textColor,
                      textAlign: col.align || 'left',
                      maxWidth: col.maxWidth || 'auto',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: col.wrap ? 'normal' : 'nowrap',
                    }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '12px', color: subColor }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
              const page = i + 1;
              const active = page === pagination.page;
              return (
                <button key={page} onClick={() => onPageChange?.(page)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    border: `1px solid ${active ? '#3b82f6' : border}`,
                    background: active ? '#3b82f6' : 'transparent',
                    color: active ? '#fff' : textColor,
                    cursor: 'pointer', fontSize: '12px', fontWeight: active ? 600 : 400,
                  }}>
                  {page}
                </button>
              );
            })}
            {pagination.pages > 7 && (
              <span style={{ color: subColor, padding: '0 4px', lineHeight: '32px' }}>…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
