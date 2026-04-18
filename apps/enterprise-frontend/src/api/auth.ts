import { apiClient } from './request';

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

export interface LoginResponse {
  code: number;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  };
  message?: string;
}

export const login = async (params: LoginParams) => {
  const res = await apiClient.post('/auth/login', params);
  return res;
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const res = await apiClient.get('/auth/current');
  return res;
};

export const getMyPermissions = async (): Promise<string[]> => {
  const res = await apiClient.get('/permissions/my');
  return (res as unknown as string[]) ?? [];
};
