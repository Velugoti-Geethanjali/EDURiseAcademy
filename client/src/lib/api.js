import axios from 'axios';

// VITE_API_URL is only needed if the frontend is hosted separately from the API
export const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bmt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('bmt_token')) {
      localStorage.removeItem('bmt_token');
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const fileUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${API_BASE}${url}`);

export default api;
