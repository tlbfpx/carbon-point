import { request, PageResult } from '../request';

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  contact: string;
  phone: string;
  email?: string;
  logo?: string;
  memberCount: number;
  totalPoints: number;
  status: 'active' | 'trial' | 'expired' | 'suspended';
  expireTime: string;
  createTime: string;
}

export interface CreateTenantParams {
  name: string;
  industry: string;
  contact: string;
  phone: string;
  email?: string;
  trialDays?: number;
}

export interface UpdateTenantParams {
  name?: string;
  industry?: string;
  contact?: string;
  phone?: string;
  email?: string;
  logo?: string;
  status?: 'active' | 'trial' | 'expired' | 'suspended';
  expireTime?: string;
}

export interface TenantQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  industry?: string;
}

export const tenantApi = {
  list: (params?: TenantQueryParams) =>
    request.get<PageResult<Tenant>>('/tenants', { params }),

  get: (tenantId: string) =>
    request.get<Tenant>(`/tenants/${tenantId}`),

  create: (params: CreateTenantParams) =>
    request.post<Tenant>('/tenants', params),

  update: (tenantId: string, params: UpdateTenantParams) =>
    request.put<Tenant>(`/tenants/${tenantId}`, params),

  delete: (tenantId: string) =>
    request.delete<void>(`/tenants/${tenantId}`),

  suspend: (tenantId: string) =>
    request.put<void>(`/tenants/${tenantId}/suspend`),

  activate: (tenantId: string) =>
    request.put<void>(`/tenants/${tenantId}/activate`),

  getStatistics: (tenantId: string) =>
    request.get<{
      memberCount: number;
      totalPoints: number;
      todayCheckIn: number;
      monthlyExchange: number;
    }>(`/tenants/${tenantId}/statistics`),
};
