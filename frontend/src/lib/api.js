import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lumora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // FormData must set multipart boundary itself — default json Content-Type breaks file upload
  if (config.data instanceof FormData) {
    if (config.headers?.delete) config.headers.delete('Content-Type');
    else delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      error.message =
        'Cannot reach server. From project root run: npm run dev — then open http://localhost:5173';
    } else if (error.response.status === 503) {
      error.message =
        error.response.data?.message ||
        'Database offline. Start MongoDB, then restart the backend.';
    } else if (error.response.status === 429) {
      error.message =
        error.response.data?.message ||
        'Too many requests. Please wait a minute and try again.';
    }
    return Promise.reject(error);
  }
);

export default api;
