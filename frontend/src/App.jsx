import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { AdminAuthProvider } from './admin/lib/adminAuth.jsx';
import { AdminToastProvider } from './admin/components/AdminToast.jsx';
import AdminLayout from './admin/components/AdminLayout.jsx';
import PageLoader from './components/PageLoader.jsx';
import { AppShell, AssessmentShell } from './components/AppShells.jsx';
import { Protected, AdminProtected } from './components/ProtectedRoute.jsx';

// ── Route-level code splitting ────────────────────────────────────────────────
// Each page is loaded only when its route is first visited.
// This shrinks the initial JS bundle from one large file into small per-route
// chunks that the browser can cache independently.
const Login            = lazy(() => import('./pages/Login.jsx'));
const Register         = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword.jsx'));
const Dashboard        = lazy(() => import('./pages/Dashboard.jsx'));
const DataLoad         = lazy(() => import('./pages/DataLoad.jsx'));
const UploadSummary    = lazy(() => import('./pages/UploadSummary.jsx'));
const ReadinessResults = lazy(() => import('./pages/ReadinessResults.jsx'));
const OrgProfile       = lazy(() => import('./pages/OrgProfile.jsx'));
const BrdGuidelines    = lazy(() => import('./pages/BrdGuidelines.jsx'));
const Governance       = lazy(() => import('./pages/Governance.jsx'));

// ── Admin pages (code-split) ──────────────────────────────────────────────────
const AdminLogin            = lazy(() => import('./admin/pages/AdminLogin.jsx'));
const AdminDashboard        = lazy(() => import('./admin/pages/AdminDashboard.jsx'));
const AnalyticsPage         = lazy(() => import('./admin/pages/AnalyticsPage.jsx'));
const UsersPage             = lazy(() => import('./admin/pages/UsersPage.jsx'));
const AdminUsersPage        = lazy(() => import('./admin/pages/AdminUsersPage.jsx'));
const AssessmentsPage       = lazy(() => import('./admin/pages/AssessmentsPage.jsx'));
const UploadsPage           = lazy(() => import('./admin/pages/UploadsPage.jsx'));
const ReportsPage           = lazy(() => import('./admin/pages/ReportsPage.jsx'));
const AuditLogsPage         = lazy(() => import('./admin/pages/AuditLogsPage.jsx'));
const ConversionFactorsPage = lazy(() => import('./admin/pages/ConversionFactorsPage.jsx'));
const SystemConfigPage      = lazy(() => import('./admin/pages/SystemConfigPage.jsx'));

export default function App() {
  const { user } = useAuth();
  return (
    <AdminAuthProvider>
      <AdminToastProvider>
        {/* Suspense catches the lazy() promises for every route chunk.
            PageLoader is shown only during the first visit to each route —
            subsequent visits use the browser cache and render instantly. */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Regular user routes ──────────────────────────────────── */}
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

            {/* ── Admin Panel routes ───────────────────────────────────── */}
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
