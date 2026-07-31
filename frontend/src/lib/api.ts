import axios from 'axios';
import { ApiValidationErrorItem } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Safely extracts a user-presentable error string from API errors,
 * formatting FastAPI 422 validation arrays without crashing React rendering.
 */
export function extractErrorMessage(error: any, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  // Handle Axios response payload
  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') return detail;

  // Handle FastAPI 422 Unprocessable Entity validation array
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item: ApiValidationErrorItem) => {
        const field = item.loc && item.loc.length > 0 ? item.loc[item.loc.length - 1] : 'Field';
        return `${field}: ${item.msg}`;
      })
      .join(', ');
  }

  if (typeof detail === 'object' && detail?.message) {
    return String(detail.message);
  }

  return error.message || fallback;
}

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

// Request Interceptor: Attach Bearer token
api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      if (!inMemoryToken) {
        inMemoryToken = localStorage.getItem('asala_token') || sessionStorage.getItem('asala_token');
      }
      if (inMemoryToken && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${inMemoryToken}`);
        } else {
          config.headers.Authorization = `Bearer ${inMemoryToken}`;
        }
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

// Silent Refresh Queue state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: 401 Silent Token Rotation Queue & 403 Error Handling
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest?._retry) {
      const requestUrl = originalRequest?.url || '';
      const suppressEvent = originalRequest?.headers?.['X-Suppress-401-Event'];

      // Do not attempt refresh on login or refresh endpoints themselves
      if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh') || suppressEvent) {
        return Promise.reject(error);
      }

      if (typeof window !== 'undefined' && navigator.onLine) {
        const token = localStorage.getItem('asala_token') || sessionStorage.getItem('asala_token');

        if (token && !token.startsWith('offline-token-')) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(newToken => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const res = await api.post(
              '/auth/refresh',
              {},
              {
                headers: { 'X-Suppress-401-Event': 'true' },
              }
            );
            const newToken = res.data.access_token;
            setAuthToken(newToken);

            if (localStorage.getItem('asala_token')) {
              localStorage.setItem('asala_token', newToken);
            } else {
              sessionStorage.setItem('asala_token', newToken);
            }

            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            window.dispatchEvent(new CustomEvent('asala:session-expired'));
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
      }
    }

    // RBAC 403 Forbidden notification
    if (error.response && error.response.status === 403) {
      if (typeof window !== 'undefined') {
        const detailMsg = extractErrorMessage(error, 'You do not have permission to perform this action.');
        window.dispatchEvent(
          new CustomEvent('asala:permission-denied', { detail: { message: detailMsg } })
        );
      }
    }

    return Promise.reject(error);
  }
);
