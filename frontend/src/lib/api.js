import axios from 'axios';
import { APP } from '../constants/index.js';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(APP.STORAGE_KEY_TOKEN);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(APP.STORAGE_KEY_TOKEN);
      localStorage.removeItem(APP.STORAGE_KEY_USER);
      // soft redirect — App routes will see no user and render Login
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
