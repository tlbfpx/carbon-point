import { apiClient } from './request';

export interface LoginParams {
  phone: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    username: string;
    phone?: string;
    email?: string;
    avatar?: string;
    tenantId: string;
    roles?: string[];
  };
}

export interface RegisterParams {
  phone: string;
  smsCode: string;
  password: string;
  inviteCode?: string;
}

export interface SmsCodeParams {
  phone: string;
  type: 'register' | 'reset_password';
}

export const login = async (params: LoginParams) => {
  const res = await apiClient.post('/auth/login', params);
  return res.data;
};

export const register = async (params: RegisterParams) => {
  const res = await apiClient.post('/auth/register', params);
  return res.data;
};

export const sendSmsCode = async (params: SmsCodeParams) => {
  const res = await apiClient.post('/auth/sms/send', params);
  return res.data;
};

export const refreshToken = async (refreshToken: string) => {
  const res = await apiClient.post('/auth/refresh', { refreshToken });
  return res.data;
};

export const logout = async () => {
  const res = await apiClient.post('/auth/logout');
  return res.data;
};
