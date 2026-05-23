import axios from 'axios';

const pinApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

pinApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('lumora_candidate_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    if (config.headers?.delete) config.headers.delete('Content-Type');
    else delete config.headers['Content-Type'];
  }
  return config;
});

pinApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timed out. Check your connection and try again.';
      } else {
        error.message = import.meta.env.VITE_API_URL
          ? 'Cannot reach the server. It may be waking up; wait a minute and try again.'
          : 'Cannot reach server. Run: npm run dev';
      }
    } else if (error.response.status === 429) {
      error.message =
        error.response.data?.message ||
        'Too many requests. Restart the backend dev server and try again.';
    }
    return Promise.reject(error);
  }
);

export function getPinToken() {
  return sessionStorage.getItem('lumora_candidate_token');
}

export function getPinStatus() {
  return sessionStorage.getItem('lumora_candidate_status');
}

export function setPinAuth({ token, candidate, interview }) {
  sessionStorage.setItem('lumora_candidate_token', token);
  sessionStorage.setItem('lumora_candidate_status', candidate.status);
  if (interview) sessionStorage.setItem('lumora_interview', JSON.stringify(interview));
}

export function clearPinAuth() {
  sessionStorage.removeItem('lumora_candidate_token');
  sessionStorage.removeItem('lumora_candidate_status');
  sessionStorage.removeItem('lumora_interview');
}

export function routeByPinStatus(candidate, navigate) {
  const status = typeof candidate === 'string' ? candidate : candidate?.status;
  const hasCv = typeof candidate === 'object' && candidate?.cvFileUrl;
  if (status === 'completed') navigate('/pin/review', { replace: true });
  else if (status === 'interview_started' && hasCv) navigate('/pin/interview', { replace: true });
  else navigate('/pin/cv', { replace: true });
}

export default pinApi;
