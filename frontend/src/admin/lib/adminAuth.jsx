/**
 * Admin Auth Context — manages admin session separate from the regular user session.
 * Includes browser-level session isolation: blocks Admin Panel access when a
 * Main App (sam_token) session is already active in the same browser profile.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ADMIN_TOKEN_KEY = 'ensogo_admin_token';
const USER_TOKEN_KEY  = 'sam_token';
const BASE = '/api/admin';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // true when a Main App session is already active in this browser profile
  const [sessionConflict, setSessionConflict] = useState(
    () => !!localStorage.getItem(USER_TOKEN_KEY)
  );

  const getToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

  const api = useCallback((config) => {
    const token = getToken();
    return axios({
      ...config,
      baseURL: BASE,
      headers: {
        ...(config.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  // Cross-tab detection: update conflict state if Main App logs in/out in another tab
  useEffect(() => {
    const handler = (e) => {
      if (e.key === USER_TOKEN_KEY || e.key === null) {
        setSessionConflict(!!localStorage.getItem(USER_TOKEN_KEY));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Rehydrate on mount — skip if Main App session is active
  useEffect(() => {
    if (localStorage.getItem(USER_TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api({ method: 'GET', url: '/auth/me' })
      .then((res) => setAdmin(res.data.admin))
      .catch(() => localStorage.removeItem(ADMIN_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, [api]);

  const login = useCallback(async (email, password) => {
    // Hard block: cannot log into Admin while Main App session is live
    if (localStorage.getItem(USER_TOKEN_KEY)) {
      const err = new Error('SESSION_CONFLICT');
      err.isSessionConflict = true;
      throw err;
    }
    const res = await api({ method: 'POST', url: '/auth/login', data: { email, password } });
    localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
    setAdmin(res.data.admin);
    return res.data.admin;
  }, [api]);

  const logout = useCallback(async () => {
    try { await api({ method: 'POST', url: '/auth/logout' }); } catch (_) { /* ignore */ }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
  }, [api]);

  // Clears the conflicting Main App session so Admin Panel can be used
  const clearUserSession = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem('sam_user');
    setSessionConflict(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, api, sessionConflict, clearUserSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
