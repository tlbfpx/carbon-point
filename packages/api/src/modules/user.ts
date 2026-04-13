import { request, Result, PageResult } from '../request';

export interface User {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId: string;
  status: 'active' | 'inactive';
  level: number;
  totalPoints: number;
  createTime: string;
}

export interface CreateUserParams {
  username: string;
  phone: string;
  email?: string;
  password?: string;
}

export interface UpdateUserParams {
  username?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
}

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const userApi = {
  list: (tenantId: string, params?: UserQueryParams) =>
    request.get<PageResult<User>>('/users', { params: { tenantId, ...params } }),

  get: (userId: string) =>
    request.get<User>(`/users/${userId}`),

  create: (tenantId: string, params: CreateUserParams) =>
    request.post<User>('/users', { tenantId, ...params }),

  update: (userId: string, params: UpdateUserParams) =>
    request.put<User>(`/users/${userId}`, params),

  delete: (userId: string) =>
    request.delete<void>(`/users/${userId}`),

  batchImport: (tenantId: string, users: CreateUserParams[]) =>
    request.post<void>('/users/batch-import', { tenantId, users }),
};
