import { platformApiClient } from './request';
import type { AdminUser } from '../store/authStore';

export const platformLogin = async (username: string, password: string) => {
  const res = await platformApiClient.post('/auth/login', { username, password });
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
  return res.data.data ?? [];
};
