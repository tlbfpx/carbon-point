import { apiClient, platformApiClient } from './request';

export interface LoginParams {
  phone: string;
  password: string;
}

export interface AdminUser {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

export const login = async (params: LoginParams) => {
  const res = await apiClient.post('/auth/login', params);
  return res.data;
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const res = await apiClient.get('/auth/current');
  return res.data;
};

export const getMyPermissions = async (): Promise<string[]> => {
  const res = await apiClient.get<{ data: string[] }>('/permissions/my');
  return res.data.data ?? [];
};

export const getPlatformMyPermissions = async (): Promise<string[]> => {
  const res = await platformApiClient.get<{ data: string[] }>('/permissions/my');
  return res.data.data ?? [];
};
