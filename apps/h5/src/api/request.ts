import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { apiLogger } from '@carbon-point/utils';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Token refresh mutex to prevent race conditions
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

// Helper to serialize request data for logging
const serializeData = (data: unknown): unknown => {
  if (!data) return data;
  try {
    const serialized = JSON.parse(JSON.stringify(data));
    // Remove sensitive fields
    if (serialized?.password) serialized.password = '***';
    if (serialized?.refreshToken) serialized.refreshToken = '***';
    return serialized;
  } catch {
    return data;
  }
};

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  apiLogger.debug(`[API请求] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
    params: config.params,
    data: serializeData(config.data),
  });
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    apiLogger.debug(`[API响应] ${res.config.method?.toUpperCase()} ${res.config.baseURL}${res.config.url} - ${res.status}`, {
      status: res.status,
      statusText: res.statusText,
    });
    // Unwrap the data from the standard API response
    return res.data;
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
              const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
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
                resolve(apiClient(originalRequest));
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
