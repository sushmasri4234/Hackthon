import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          err.config._retry = true;
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return API(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default API;
