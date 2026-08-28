import axios from 'axios';

// Base backend URL: Uses environment variable VITE_API_URL if defined, otherwise falls back to local backend
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, ''); // Strip any trailing slashes

// Create a pre-configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to automatically attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
