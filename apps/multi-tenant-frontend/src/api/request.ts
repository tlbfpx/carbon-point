import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { apiLogger } from '../utils/logger';

const PLATFORM_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:8080';

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
  (res) => res.data,
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
              const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
              useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);

              // Process queued requests with new token
              refreshQueue.forEach(cb => cb(accessToken));
              refreshQueue = [];
            } catch {
              // Reject all queued requests
              refreshQueue.forEach(cb => cb(''));
              refreshQueue = [];
              useAuthStore.getState().logout();
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
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
