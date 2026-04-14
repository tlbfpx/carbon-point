import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/shared/store/authStore';
import { apiLogger } from '@carbon-point/utils';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Platform admin API client - uses /platform/* paths (no /api prefix)
const PLATFORM_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:8080/platform';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

export const platformApiClient = axios.create({
  baseURL: PLATFORM_BASE_URL,
  timeout: 30000,
});

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

platformApiClient.interceptors.request.use((config) => {
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
    return res;
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
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
          useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);
          const originalRequest = error.config;
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

platformApiClient.interceptors.response.use(
  (res) => {
    apiLogger.debug(`[API响应] ${res.config.method?.toUpperCase()} ${res.config.baseURL}${res.config.url} - ${res.status}`, {
      status: res.status,
      statusText: res.statusText,
    });
    return res;
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
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${PLATFORM_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
          useAuthStore.getState().login(accessToken, newRefresh, useAuthStore.getState().user!);
          const originalRequest = error.config;
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return platformApiClient(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
