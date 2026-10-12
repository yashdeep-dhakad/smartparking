import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 20000 });

export const TOKEN_KEY = 'pw_token';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Expired / invalid token: tell the app to log out (the server is the source of truth).
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('pw:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) =>
  e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running on port 5000?' : e?.message || 'Something went wrong.');

export default api;
