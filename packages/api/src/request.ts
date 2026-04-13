import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Result<T> response wrapper from backend
export interface Result<T = any> {
  code: number;
  message?: string;
  data: T;
}

export interface PageResult<T = any> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onUnauthorized?: () => void;
  onTokenRefreshed?: (accessToken: string, refreshToken: string) => void;
}

const defaultOptions: ApiClientOptions = {
  baseURL: BASE_URL,
  timeout: 15000,
};

export const createApiClient = (options: ApiClientOptions = {}): AxiosInstance => {
  const { baseURL, timeout, getAccessToken, getRefreshToken, onUnauthorized, onTokenRefreshed } = {
    ...defaultOptions,
    ...options,
  };

  const client = axios.create({ baseURL, timeout });

  // Request interceptor
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken?.();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse<Result>) => {
      const { code, message, data } = response.data;
      if (code === 200 || code === 0) {
        return response;
      }
      // Business error - reject with the error
      const err = new Error(message || '请求失败');
      (err as any).code = code;
      (err as any).data = data;
      return Promise.reject(err);
    },
    async (error) => {
      const originalRequest = error.config;

      // 401 - try to refresh token
      if (error.response?.status === 401 && getRefreshToken && getAccessToken && onTokenRefreshed && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            onTokenRefreshed(accessToken, newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch {
          onUnauthorized?.();
          return Promise.reject(error);
        }
      }

      if (error.response?.status === 401) {
        onUnauthorized?.();
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Default singleton client
let defaultClient: AxiosInstance | null = null;

export const getApiClient = (): AxiosInstance => {
  if (!defaultClient) {
    defaultClient = createApiClient();
  }
  return defaultClient;
};

// Convenience methods
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    getApiClient().get<Result<T>>(url, config).then((res) => res.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    getApiClient().post<Result<T>>(url, data, config).then((res) => res.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    getApiClient().put<Result<T>>(url, data, config).then((res) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    getApiClient().delete<Result<T>>(url, config).then((res) => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    getApiClient().patch<Result<T>>(url, data, config).then((res) => res.data),
};

// Auth module
export * from './modules/auth';

// User module
export * from './modules/user';

// Tenant module
export * from './modules/tenant';

// Checkin module
export * from './modules/checkin';

// Points module
export * from './modules/points';

// Mall module
export * from './modules/mall';

// Report module
export * from './modules/report';

// Notification module
export * from './modules/notification';
