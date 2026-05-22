/**
 * AdminLayout — root layout shell for the admin panel.
 * Provides: sticky top navbar, collapsible sidebar, dark mode, mobile responsiveness.
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '../lib/adminAuth';

// ── Dark Mode Context ─────────────────────────────────────────────────────────
const DarkModeContext = createContext({ dark: false, toggle: () => {} });
export function useDarkMode() { return useContext(DarkModeContext); }

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ path, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const icons = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  assessment: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  report: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  audit: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  factor: 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7',
  config: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  menu: 'M3 12h18M3 6h18M3 18h18',
  chevronLeft: 'M15 18l-6-6 6-6',
  analytics: 'M18 20V10M12 20V4M6 20v-6',
  adminUser: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
};

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: 'dashboard', permission: null },
  { label: 'Analytics', path: '/admin/analytics', icon: 'analytics', permission: 'analytics:read' },
  { label: 'Users', path: '/admin/users', icon: 'users', permission: 'users:read' },
  { label: 'Admin Users', path: '/admin/admin-users', icon: 'adminUser', permission: null, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Assessments', path: '/admin/assessments', icon: 'assessment', permission: 'assessments:read' },
  { label: 'Uploads', path: '/admin/uploads', icon: 'upload', permission: 'uploads:read' },
  { label: 'Reports', path: '/admin/reports', icon: 'report', permission: 'reports:read' },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'audit', permission: 'auditlogs:read' },
  { label: 'Emission Factors', path: '/admin/conversion-factors', icon: 'factor', permission: 'conversionfactors:read' },
  { label: 'System Config', path: '/admin/system-config', icon: 'config', permission: 'systemconfig:read' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function AdminSidebar({ collapsed, onToggle }) {
  const { admin } = useAdminAuth();
  const loc = useLocation();
  const { dark } = useDarkMode();

  const bg = dark ? '#0f172a' : '#1e293b';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)';

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles && admin) return item.roles.includes(admin.role);
    return true;
  });

  return (
    <aside
      style={{
        width: collapsed ? '60px' : '220px',
        minHeight: '100vh',
        background: bg,
        borderRight: `1px solid ${border}`,
        transition: 'width 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '16px 10px' : '16px 20px',
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minHeight: '64px',
      }}>
        <img src="/EnSoGo%20Logo.png" alt="EnSoGo" width="32" height="32"
             style={{ borderRadius: '8px', flexShrink: 0, background: 'rgba(255,255,255,0.1)' }} />
        {!collapsed && (
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', lineHeight: 1 }}>EnSoGo</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', letterSpacing: '0.1em', marginTop: '2px' }}>ADMIN PANEL</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {visibleItems.map((item) => {
          const active = item.path === '/admin'
            ? loc.pathname === '/admin'
            : loc.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '10px' : '9px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(99,179,237,0.18)' : 'transparent',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.12s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <span style={{ flexShrink: 0, color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)' }}>
                <Icon path={icons[item.icon]} size={18} />
              </span>
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              {active && !collapsed && (
                <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          margin: '8px 6px',
          padding: '8px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.12s',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon
          path={collapsed ? 'M9 18l6-6-6-6' : icons.chevronLeft}
          size={16}
        />
      </button>
    </aside>
  );
}

// ── Top Navbar ─────────────────────────────────────────────────────────────────
function AdminNavbar({ onMenuToggle }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const loc = useLocation();

  // Derive current page label from path
  const currentPage = NAV_ITEMS.find((item) => {
    if (item.path === '/admin') return loc.pathname === '/admin';
    return loc.pathname.startsWith(item.path);
  })?.label || 'Admin Panel';

  const bg = dark ? '#1e293b' : '#ffffff';
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subTextColor = dark ? 'rgba(255,255,255,0.45)' : '#64748b';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: bg,
      borderBottom: `1px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      height: '60px',
      gap: '12px',
      boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Mobile menu toggle */}
      <button onClick={onMenuToggle}
        style={{ display: 'none', border: 'none', background: 'none', cursor: 'pointer', color: textColor, padding: '4px' }}
        className="admin-menu-btn">
        <Icon path={icons.menu} size={20} />
      </button>

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: textColor }}>{currentPage}</div>
        <div style={{ fontSize: '11px', color: subTextColor }}>EnSoGo Admin Panel</div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        style={{
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          background: 'transparent',
          cursor: 'pointer',
          color: textColor,
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <Icon path={dark ? icons.sun : icons.moon} size={16} />
      </button>

      {/* Admin info + logout */}
      {admin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: textColor }}>{admin.fullName}</div>
            <div style={{ fontSize: '10px', color: subTextColor }}>{admin.role}</div>
          </div>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0,
          }}>
            {admin.fullName?.[0]?.toUpperCase() || 'A'}
          </div>
          <button
            onClick={async () => { await logout(); navigate('/admin/login'); }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: '#ef4444', padding: '6px', borderRadius: '6px',
              display: 'flex', alignItems: 'center',
            }}
            title="Logout"
          >
            <Icon path={icons.logout} size={18} />
          </button>
        </div>
      )}
    </header>
  );
}

// ── Main AdminLayout ──────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ensogo_admin_dark') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ensogo_admin_dark', darkMode);
    document.documentElement.setAttribute('data-admin-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDark = () => setDarkMode((d) => !d);
  const toggleSidebar = () => setSidebarCollapsed((c) => !c);

  const pageBg = darkMode ? '#0f172a' : '#f8fafc';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';

  return (
    <DarkModeContext.Provider value={{ dark: darkMode, toggle: toggleDark }}>
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: pageBg,
        color: textColor,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}>
        {/* Sidebar — hidden on mobile by default */}
        <div style={{ display: mobileOpen ? 'block' : undefined }} className="admin-sidebar-wrap">
          <AdminSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 40, display: 'none',
            }}
            className="admin-overlay"
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AdminNavbar onMenuToggle={() => setMobileOpen((m) => !m)} />
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-menu-btn { display: flex !important; }
          .admin-sidebar-wrap { position: fixed; top: 0; left: 0; z-index: 45; height: 100vh; display: none; }
          .admin-sidebar-wrap.open { display: block; }
          .admin-overlay { display: block !important; }
        }
      `}</style>
    </DarkModeContext.Provider>
  );
}
