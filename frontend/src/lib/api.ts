import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Bearer token if present in localStorage or sessionStorage
api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('asala_token') || sessionStorage.getItem('asala_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && navigator.onLine) {
        window.dispatchEvent(new CustomEvent('asala:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);
