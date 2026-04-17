import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { apiLogger } from '../utils/logger';

const PLATFORM_BASE_URL = import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:8080';

export const platformApiClient = axios.create({
  baseURL: PLATFORM_BASE_URL,
  timeout: 30000,
});

platformApiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  apiLogger.debug(`[API请求] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

platformApiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
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
