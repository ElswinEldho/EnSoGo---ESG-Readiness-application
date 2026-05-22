import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { useUpload } from './lib/uploadContext.jsx';
import { AdminAuthProvider, useAdminAuth } from './admin/lib/adminAuth.jsx';
import { AdminToastProvider } from './admin/components/AdminToast.jsx';
import AdminLayout from './admin/components/AdminLayout.jsx';
import { sectorName } from './lib/sectors.js';

// ── Route-level code splitting ────────────────────────────────────────────────
// Each page is loaded only when its route is first visited.
// This shrinks the initial JS bundle from one large file into small per-route
// chunks that the browser can cache independently.
const Login           = lazy(() => import('./pages/Login.jsx'));
const Register        = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword.jsx'));
const Dashboard       = lazy(() => import('./pages/Dashboard.jsx'));
const DataLoad        = lazy(() => import('./pages/DataLoad.jsx'));
const UploadSummary   = lazy(() => import('./pages/UploadSummary.jsx'));
const ReadinessResults = lazy(() => import('./pages/ReadinessResults.jsx'));
const OrgProfile      = lazy(() => import('./pages/OrgProfile.jsx'));
const BrdGuidelines   = lazy(() => import('./pages/BrdGuidelines.jsx'));
const Governance      = lazy(() => import('./pages/Governance.jsx'));

// ── Admin pages (code-split) ───────────────────────────────────────────────────
const AdminLogin          = lazy(() => import('./admin/pages/AdminLogin.jsx'));
const AdminDashboard      = lazy(() => import('./admin/pages/AdminDashboard.jsx'));
const AnalyticsPage       = lazy(() => import('./admin/pages/AnalyticsPage.jsx'));
const UsersPage           = lazy(() => import('./admin/pages/UsersPage.jsx'));
const AdminUsersPage      = lazy(() => import('./admin/pages/AdminUsersPage.jsx'));
const AssessmentsPage     = lazy(() => import('./admin/pages/AssessmentsPage.jsx'));
const UploadsPage         = lazy(() => import('./admin/pages/UploadsPage.jsx'));
const ReportsPage         = lazy(() => import('./admin/pages/ReportsPage.jsx'));
const AuditLogsPage       = lazy(() => import('./admin/pages/AuditLogsPage.jsx'));
const ConversionFactorsPage = lazy(() => import('./admin/pages/ConversionFactorsPage.jsx'));
const SystemConfigPage    = lazy(() => import('./admin/pages/SystemConfigPage.jsx'));

// Minimal loading fallback — invisible spinner so no layout shift occurs
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #e0f2fe', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'app-spin 0.65s linear infinite' }} />
      <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Icons
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IconHome      = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />;
const IconUser      = () => <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const IconLogout    = () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />;
const IconSettings  = () => <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />;
const IconGovernance = () => <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
const IconSummary    = () => <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />;
const IconReadiness  = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M12 6v6l4 2" />
    <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" opacity="0.3"/>
    <path d="M16.5 4.5l3 3M18 3v1.5M20.5 5.5l-1.5 1" strokeWidth="1.4"/>
  </svg>
);

// Sidebar
function Sidebar({ assessmentId }) {
  const { user, logout } = useAuth();
  const { hasUpload } = useUpload();
  const nav = useNavigate();
  const loc = useLocation();
  const path = loc.pathname;
  const wfActive = (seg) => assessmentId && path.includes(seg);
  const uploadReady = assessmentId ? hasUpload(assessmentId) : false;

  const NavItem = ({ icon, label, onClick, active, number, disabled }) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? 'Upload at least one data file to unlock this step' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${active && !disabled ? 'text-white' : !disabled ? 'hover:text-white' : ''}`}
      style={
        active && !disabled
          ? { background: 'rgba(255,255,255,0.22)', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }
          : !disabled
          ? { color: 'rgba(255,255,255,0.7)' }
          : { color: 'rgba(255,255,255,0.3)' }
      }
    >
      {number != null && (
        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0`}
              style={active && !disabled
                ? { background: 'rgba(255,255,255,0.95)', color: '#0284c7' }
                : { background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}>
          {number}
        </span>
      )}
      {!number && (
        <span className={`shrink-0`}
              style={{ color: active && !disabled ? 'white' : 'rgba(255,255,255,0.6)' }}>
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
      {active && !disabled && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.8)' }} />}
      {disabled && (
        <span className="ml-auto shrink-0 text-slate-600">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
           style={{
             background: 'linear-gradient(160deg, #0369a1 0%, #0284c7 40%, #0ea5e9 100%)',
             borderRight: '1px solid rgba(255,255,255,0.12)',
             position: 'relative',
             // overflow:hidden clips the decorative orbs that sit at top:-40px and
             // right:-40px — without this the orbs paint outside the sidebar bounds
             // and any layout change that moves the sidebar causes viewport CLS.
             overflow: 'hidden',
           }}>
      {/* Subtle decorative orbs matching login page */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '120px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="px-4 py-3 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-2.5">
          {/* width/height HTML attributes reserve the 40×40 box before CSS
              loads, preventing image-load CLS in the sidebar header */}
          <img src="/EnSoGo%20Logo.png" alt="EnSoGo"
               width="40" height="40"
               className="w-10 h-10 rounded-xl shrink-0 object-cover"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }} />
          <div>
            <div className="text-[13px] font-bold text-white leading-none tracking-tight">EnSoGo</div>
            <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Readiness Suite</div>
          </div>
        </div>
        {/* Fixed-height block: always reserves the same vertical space whether
            user data is available or not.  Without this, the nav items below
            shift down when the /auth/me rehydration fires setUser(), causing
            a large CLS hit for every authenticated page load. */}
        <div className="mt-3 px-1" style={{ minHeight: '32px' }}>
          {user && (
            <>
              <div className="text-[11px] text-white/80 truncate">{user.organizationName}</div>
              <div className="text-[10px] text-white/45 truncate">{sectorName(user.sectorCode)}</div>
            </>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 relative z-10">
        <div className="px-2 mb-1.5 mt-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Workflow</span>
        </div>
        <NavItem icon={<IconHome />} label="Dashboard" number={null}
          onClick={() => nav('/')} active={path === '/'} />
        {assessmentId && (
          <>
            <NavItem number="1" label="Data Load"
              onClick={() => nav(`/assessment/${assessmentId}/data-load`)}
              active={wfActive('data-load')} />
            <NavItem icon={<IconSummary />} label="Summary"
              onClick={() => nav(`/assessment/${assessmentId}/summary`)}
              active={wfActive('summary')}
              disabled={!uploadReady} />
            <NavItem icon={<IconReadiness />} label="Readiness"
              onClick={() => nav(`/assessment/${assessmentId}/readiness`)}
              active={wfActive('readiness')}
              disabled={!uploadReady} />
            <NavItem icon={<IconGovernance />} label="Governance"
              onClick={() => nav(`/assessment/${assessmentId}/governance`)}
              active={wfActive('governance')} />
          </>
        )}

        <div className="px-2 mb-1.5 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Reference</span>
        </div>
        <NavItem icon={<IconSettings />} label="Guidelines"
          onClick={() => nav('/brd-guidelines')} active={path.includes('brd-guidelines')} />

        <div className="px-2 mb-1.5 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Account</span>
        </div>
        <NavItem icon={<IconUser />} label="Profile"
          onClick={() => nav('/org-profile?edit=1')} active={path.includes('org-profile')} />
        <NavItem icon={<IconLogout />} label="Log Out"
          onClick={async () => { await logout(); nav('/login'); }} active={false} />
      </nav>

      {assessmentId && (
        <div className="mx-2 mb-3 p-3 rounded-xl relative z-10"
             style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-g-400 animate-pulse" />
            <span className="text-[11px] text-white/80">Live</span>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Session conflict screen ────────────────────────────────────────────────────
// Shown when this browser already has the opposite session type active.
// mode="admin"  → Admin Panel is blocked because Main App session exists
// mode="user"   → Main App is blocked because Admin Panel session exists
function SessionConflictScreen({ mode, onClear }) {
  const isAdmin = mode === 'admin';
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      background: isAdmin
        ? 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)'
        : 'linear-gradient(135deg,#e0f2fe 0%,#f0f9ff 40%,#e8f4fd 70%,#dbeafe 100%)',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: isAdmin ? 'rgba(255,255,255,0.05)' : '#ffffff',
        backdropFilter: isAdmin ? 'blur(12px)' : 'none',
        border: isAdmin ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(186,230,255,0.6)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: isAdmin
          ? '0 24px 80px rgba(0,0,0,0.5)'
          : '0 8px 40px rgba(3,105,161,0.1)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isAdmin ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
          border: isAdmin ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(239,68,68,0.2)',
        }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
               stroke={isAdmin ? '#fca5a5' : '#ef4444'} strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontSize: '18px', fontWeight: 700, marginBottom: '10px',
          color: isAdmin ? '#f1f5f9' : '#0c4a6e',
        }}>
          {isAdmin ? 'Admin Panel Blocked' : 'Main App Blocked'}
        </div>

        {/* Message */}
        <div style={{
          fontSize: '13px', lineHeight: '1.65', marginBottom: '28px',
          color: isAdmin ? 'rgba(255,255,255,0.55)' : '#64748b',
        }}>
          {isAdmin
            ? 'The Admin Panel cannot be opened while a Main App session is active in this browser. Please use a different browser or incognito window, or sign out of the Main App first.'
            : 'The Main App cannot be opened while an Admin Panel session is active in this browser. Please use a different browser or incognito window, or sign out of the Admin Panel first.'}
        </div>

        {/* Clear session button */}
        <button
          onClick={onClear}
          style={{
            width: '100%', padding: '12px',
            borderRadius: '12px', border: 'none',
            background: isAdmin
              ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
              : 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer',
            boxShadow: isAdmin
              ? '0 4px 16px rgba(59,130,246,0.3)'
              : '0 4px 16px rgba(3,105,161,0.35)',
          }}
        >
          {isAdmin
            ? 'Sign Out of Main App & Continue'
            : 'Sign Out of Admin Panel & Continue'}
        </button>

        <div style={{ marginTop: '16px', fontSize: '11px', color: isAdmin ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
          This browser profile can only run one session at a time.
        </div>
      </div>
    </div>
  );
}

// ── Admin auth guard ──────────────────────────────────────────────────────────
function AdminProtected({ children }) {
  const { admin, loading, sessionConflict, clearUserSession } = useAdminAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (sessionConflict) return <SessionConflictScreen mode="admin" onClear={clearUserSession} />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  return children;
}

// ── Regular user auth guard ───────────────────────────────────────────────────
// Auth guard
function Protected({ children, requireProfile = true }) {
  const { user, sessionConflict, clearAdminSession } = useAuth();
  const loc = useLocation();
  if (sessionConflict) return <SessionConflictScreen mode="user" onClear={clearAdminSession} />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireProfile && !user.orgProfileComplete && loc.pathname !== '/org-profile')
    return <Navigate to="/org-profile" replace />;
  return children;
}

// Shells
function AssessmentShell({ children }) {
  const { id } = useParams();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar assessmentId={id} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar assessmentId={null} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Root
export default function App() {
  const { user } = useAuth();
  const ProtectedRoute = ({ element, requireProfile = true }) => (
    <Protected requireProfile={requireProfile}>{element}</Protected>
  );
  return (
    <AdminAuthProvider>
      <AdminToastProvider>
        {/* Suspense catches the lazy() promises for every route chunk.
            PageLoader is shown only during the first visit to each route —
            subsequent visits use the browser cache and render instantly. */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Regular user routes ─────────────────────────────────── */}
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/org-profile" element={
              <Protected requireProfile={false}><AppShell><OrgProfile /></AppShell></Protected>
            } />
            <Route path="/" element={
              <Protected><AppShell><Dashboard /></AppShell></Protected>
            } />
            <Route path="/brd-guidelines" element={
              <Protected><AppShell><BrdGuidelines /></AppShell></Protected>
            } />

            <Route path="/assessment/:id/data-load" element={
              <Protected><AssessmentShell><DataLoad /></AssessmentShell></Protected>
            } />
            <Route path="/assessment/:id/summary" element={
              <Protected><AssessmentShell><UploadSummary /></AssessmentShell></Protected>
            } />
            <Route path="/assessment/:id/readiness" element={
              <Protected><AssessmentShell><ReadinessResults /></AssessmentShell></Protected>
            } />
            <Route path="/assessment/:id/governance" element={
              <Protected><AssessmentShell><Governance /></AssessmentShell></Protected>
            } />

            {/* ── Admin Panel routes ──────────────────────────────────── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminProtected><AdminLayout><AdminDashboard /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/analytics" element={
              <AdminProtected><AdminLayout><AnalyticsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/users" element={
              <AdminProtected><AdminLayout><UsersPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/admin-users" element={
              <AdminProtected><AdminLayout><AdminUsersPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/assessments" element={
              <AdminProtected><AdminLayout><AssessmentsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/uploads" element={
              <AdminProtected><AdminLayout><UploadsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/reports" element={
              <AdminProtected><AdminLayout><ReportsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/audit-logs" element={
              <AdminProtected><AdminLayout><AuditLogsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/conversion-factors" element={
              <AdminProtected><AdminLayout><ConversionFactorsPage /></AdminLayout></AdminProtected>
            } />
            <Route path="/admin/system-config" element={
              <AdminProtected><AdminLayout><SystemConfigPage /></AdminLayout></AdminProtected>
            } />

            <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </AdminToastProvider>
    </AdminAuthProvider>
  );
}
