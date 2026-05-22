import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

// Storage key used by the Admin Panel — detected here for conflict checking
const ADMIN_TOKEN_KEY = 'ensogo_admin_token';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sam_user') || 'null'); } catch { return null; }
  });

  // true when an Admin Panel session is already active in this browser profile
  const [sessionConflict, setSessionConflict] = useState(
    () => !!localStorage.getItem(ADMIN_TOKEN_KEY)
  );

  // Cross-tab detection: update conflict state if Admin logs in/out in another tab
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ADMIN_TOKEN_KEY || e.key === null) {
        setSessionConflict(!!localStorage.getItem(ADMIN_TOKEN_KEY));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Hydrate from server on first mount so orgProfile / completeness stay fresh
  useEffect(() => {
    const t = localStorage.getItem('sam_token');
    if (!t || !user) return;
    api.get('/auth/me')
      .then((r) => {
        localStorage.setItem('sam_user', JSON.stringify(r.data.user));
        setUser(r.data.user);
      })
      .catch(() => { /* token expired — interceptor handles redirect */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password, remember) {
    // Hard block: cannot log into Main App while Admin session is live
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      const err = new Error('SESSION_CONFLICT');
      err.isSessionConflict = true;
      throw err;
    }
    const r = await api.post('/auth/login', { email, password, remember });
    localStorage.setItem('sam_token', r.data.token);
    const me = await api.get('/auth/me');
    localStorage.setItem('sam_user', JSON.stringify(me.data.user));
    setUser(me.data.user);
    return me.data.user;
  }

  async function register(payload) {
    // Hard block: cannot register while Admin session is live
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      const err = new Error('SESSION_CONFLICT');
      err.isSessionConflict = true;
      throw err;
    }
    const r = await api.post('/auth/register', payload);
    localStorage.setItem('sam_token', r.data.token);
    const me = await api.get('/auth/me');
    localStorage.setItem('sam_user', JSON.stringify(me.data.user));
    setUser(me.data.user);
    return me.data.user;
  }

  async function saveOrgProfile(profile) {
    const r = await api.put('/auth/me/org-profile', profile);
    localStorage.setItem('sam_user', JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (_e) { /* clear client state regardless of server error */ }
    localStorage.removeItem('sam_token');
    localStorage.removeItem('sam_user');
    setUser(null);
  }

  // Clears the conflicting Admin session so the Main App can be used
  function clearAdminSession() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setSessionConflict(false);
  }

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, saveOrgProfile, setUser, sessionConflict, clearAdminSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
