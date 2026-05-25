// Route guards for regular users and admin users.
// Both guards handle session-conflict detection (prevents running both session
// types in the same browser profile at the same time).
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useAdminAuth } from '../admin/lib/adminAuth.jsx';
import PageLoader from './PageLoader.jsx';
import SessionConflictScreen from './SessionConflictScreen.jsx';

// ── Regular user auth guard ───────────────────────────────────────────────────
export function Protected({ children, requireProfile = true }) {
  const { user, sessionConflict, clearAdminSession } = useAuth();
  const loc = useLocation();
  if (sessionConflict) return <SessionConflictScreen mode="user" onClear={clearAdminSession} />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireProfile && !user.orgProfileComplete && loc.pathname !== '/org-profile')
    return <Navigate to="/org-profile" replace />;
  return children;
}

// ── Admin auth guard ──────────────────────────────────────────────────────────
export function AdminProtected({ children }) {
  const { admin, loading, sessionConflict, clearUserSession } = useAdminAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (sessionConflict) return <SessionConflictScreen mode="admin" onClear={clearUserSession} />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  return children;
}
