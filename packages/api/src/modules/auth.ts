import { request, Result } from '../request';

export interface LoginParams {
  phone: string;
  password: string;
  remember?: boolean;
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

export interface AuthUser {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId: string;
  roles?: string[];
  permissions?: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export const authApi = {
  login: (params: LoginParams) =>
    request.post<LoginResponse>('/auth/login', params),

  register: (params: RegisterParams) =>
    request.post<void>('/auth/register', params),

  logout: () =>
    request.post<void>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    request.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  sendSmsCode: (params: SmsCodeParams) =>
    request.post<void>('/auth/sms/send', params),

  getCurrentUser: () =>
    request.get<AuthUser>('/auth/current'),

  updatePassword: (oldPassword: string, newPassword: string) =>
    request.put<void>('/auth/password', { oldPassword, newPassword }),
};
