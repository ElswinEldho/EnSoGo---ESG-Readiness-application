/**
 * adminApi — typed API helpers for every admin endpoint.
 * Pass the `api` function from useAdminAuth() as the first arg.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminAuthApi = {
  me: (api) => api({ method: 'GET', url: '/auth/me' }),
};

// ── Platform Users ─────────────────────────────────────────────────────────────
export const adminUsersApi = {
  stats: (api) => api({ method: 'GET', url: '/users/stats' }),
  list: (api, params) => api({ method: 'GET', url: '/users', params }),
  get: (api, id) => api({ method: 'GET', url: `/users/${id}` }),
  updateStatus: (api, id, status) =>
    api({ method: 'PUT', url: `/users/${id}/status`, data: { status } }),
  delete: (api, id) => api({ method: 'DELETE', url: `/users/${id}` }),
};

// ── Admin Panel Users ───────────────────────────────────────────────────────────
export const adminAdminUsersApi = {
  list: (api, params) => api({ method: 'GET', url: '/admin-users', params }),
  create: (api, data) => api({ method: 'POST', url: '/admin-users', data }),
  update: (api, id, data) => api({ method: 'PUT', url: `/admin-users/${id}`, data }),
  delete: (api, id) => api({ method: 'DELETE', url: `/admin-users/${id}` }),
};

// ── Analytics ──────────────────────────────────────────────────────────────────
export const adminAnalyticsApi = {
  dashboard: (api) => api({ method: 'GET', url: '/analytics/dashboard' }),
  userGrowth: (api, days = 30) =>
    api({ method: 'GET', url: '/analytics/user-growth', params: { days } }),
  assessmentsByStatus: (api) =>
    api({ method: 'GET', url: '/analytics/assessments-by-status' }),
  assessmentsBySector: (api) =>
    api({ method: 'GET', url: '/analytics/assessments-by-sector' }),
  uploadActivity: (api, days = 14) =>
    api({ method: 'GET', url: '/analytics/upload-activity', params: { days } }),
};

// ── Assessments ────────────────────────────────────────────────────────────────
export const adminAssessmentsApi = {
  stats: (api) => api({ method: 'GET', url: '/assessments/stats' }),
  list: (api, params) => api({ method: 'GET', url: '/assessments', params }),
  get: (api, id) => api({ method: 'GET', url: `/assessments/${id}` }),
};

// ── Uploads ────────────────────────────────────────────────────────────────────
export const adminUploadsApi = {
  stats: (api) => api({ method: 'GET', url: '/uploads/stats' }),
  list: (api, params) => api({ method: 'GET', url: '/uploads', params }),
};

// ── Reports ────────────────────────────────────────────────────────────────────
export const adminReportsApi = {
  stats: (api) => api({ method: 'GET', url: '/reports/stats' }),
  list: (api, params) => api({ method: 'GET', url: '/reports', params }),
  delete: (api, id) => api({ method: 'DELETE', url: `/reports/${id}` }),
};

// ── Audit Logs ─────────────────────────────────────────────────────────────────
export const adminAuditApi = {
  list: (api, params) => api({ method: 'GET', url: '/audit-logs', params }),
  actionTypes: (api) => api({ method: 'GET', url: '/audit-logs/action-types' }),
};

// ── Conversion Factors ─────────────────────────────────────────────────────────
export const adminConversionApi = {
  list: (api, params) => api({ method: 'GET', url: '/conversion-factors', params }),
  get: (api, id) => api({ method: 'GET', url: `/conversion-factors/${id}` }),
  create: (api, data) => api({ method: 'POST', url: '/conversion-factors', data }),
  update: (api, id, data) =>
    api({ method: 'PUT', url: `/conversion-factors/${id}`, data }),
  delete: (api, id) => api({ method: 'DELETE', url: `/conversion-factors/${id}` }),
  recalculateAll: (api) => api({ method: 'POST', url: '/conversion-factors/recalculate-all' }),
};

// ── System Config ──────────────────────────────────────────────────────────────
export const adminConfigApi = {
  list: (api, params) => api({ method: 'GET', url: '/system-config', params }),
  get: (api, key) => api({ method: 'GET', url: `/system-config/${key}` }),
  update: (api, key, value) =>
    api({ method: 'PUT', url: `/system-config/${key}`, data: { value } }),
};
