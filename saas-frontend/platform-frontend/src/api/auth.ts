import { platformApiClient } from './request';
import type { AdminUser } from '../store/authStore';

interface LoginResponse {
  code: number;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
    permissions?: string[];
  };
}

export const platformLogin = async (username: string, password: string): Promise<LoginResponse> => {
  const res = await platformApiClient.post<LoginResponse>('/auth/login', { username, password });
  return res.data;
};

export const logout = async () => {
  await platformApiClient.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const res = await platformApiClient.get('/auth/current');
  return res.data;
};

export const getPlatformMyPermissions = async (): Promise<string[]> => {
  const res = await platformApiClient.get<{ data: string[] }>('/permissions/my');
  // Interceptor already unwraps Axios res.data, so res = Result<{data: string[]}>
  return res.data ?? [];
};
