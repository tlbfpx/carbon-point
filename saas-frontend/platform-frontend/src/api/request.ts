import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { apiLogger } from '../utils/logger';

const PLATFORM_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:8080/platform';

// Force redirect to login — used when both access & refresh tokens are expired
const forceRedirectToLogin = () => {
  const { isAuthenticated, logout } = useAuthStore.getState();
  if (isAuthenticated) {
    logout();
    // Use window.location for an immediate, unconditional redirect
    // that bypasses any pending React state updates
    window.location.href = '/platform/login';
  }
};

export const platformApiClient = axios.create({
  baseURL: PLATFORM_BASE_URL,
  timeout: 30000,
});

// Token refresh mutex to prevent race conditions
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

platformApiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  apiLogger.debug(`[API请求] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

platformApiClient.interceptors.response.use(
  (res) => {
    const data = res.data;
    // Check for business error codes — backend returns { code: "0000", data, message } for success
    if (data && data.code && data.code !== '0000') {
      return Promise.reject(new Error(data.message || '操作失败'));
    }
    return data;
  },
  async (error: AxiosError) => {
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const status = error.response?.status;
    const message = error.message || (error.response?.data as any)?.message || '网络错误';

    if (status === 401) {
      apiLogger.warn(`[API错误] ${method} ${url} - 401 Unauthorized`);
    } else {
      apiLogger.error(`[API错误] ${method} ${url} - ${status || '网络错误'} ${message}`, {
        status,
        message,
        responseData: error.response?.data,
      });
    }

    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (refreshToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const refreshRes = await axios.post(`${PLATFORM_BASE_URL}/auth/refresh`, { refreshToken });
              const refreshData = refreshRes.data?.data;
              if (!refreshData?.accessToken) {
                throw new Error('Refresh failed: no token returned');
              }
              const { accessToken, refreshToken: newRefresh } = refreshData;
              useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);

              // Process queued requests with new token
              refreshQueue.forEach(cb => cb(accessToken));
              refreshQueue = [];
            } catch {
              // Reject all queued requests and redirect to login
              refreshQueue.forEach(cb => cb(''));
              refreshQueue = [];
              forceRedirectToLogin();
              return Promise.reject(error);
            } finally {
              isRefreshing = false;
            }
          }

          // Queue this request until token is refreshed
          return new Promise((resolve, reject) => {
            refreshQueue.push((token: string) => {
              if (token && originalRequest) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(platformApiClient(originalRequest));
              } else {
                reject(error);
              }
            });
          });
        } else {
          forceRedirectToLogin();
        }
      }
    }
    return Promise.reject(error);
  }
);
