import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ims_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { success, data } and turn API errors into readable messages.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      (error.code === 'ECONNABORTED' ? 'The request timed out.' : null) ||
      (!error.response ? 'Cannot reach the API. Is the backend running?' : 'Something went wrong.');

    if (status === 401 && onUnauthorized) onUnauthorized();

    return Promise.reject(Object.assign(new Error(message), {
      status,
      details: error.response?.data?.error?.details || null,
    }));
  },
);

/** Helper: returns response.data.data, or the whole body if it isn't wrapped. */
export const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);
export const unwrapWithMeta = (res) => ({ data: unwrap(res), meta: res?.data?.meta ?? null });

export default api;
