import { platformApiClient } from './request';

export interface Enterprise {
  id: string;
  name: string;
  contactPhone: string;
  contactName: string;
  packageId?: string;
  packageName: string;
  userCount: number;
  status: 'active' | 'inactive';
  createTime: string;
  expireTime?: string;
}

export interface PlatformAdmin {
  userId: string;
  username: string;
  phone: string;
  email?: string;
  roles: string[];
  status: number;
  lastLoginTime?: string;
  createTime: string;
}

export interface PlatformConfig {
  key: string;
  value: string | boolean | number;
  description?: string;
  group?: string;
}

export interface PlatformStats {
  totalEnterprises: number;
  activeEnterprises: number;
  totalUsers: number;
  totalPoints: number;
  totalExchanges: number;
}

export interface PermissionPackage {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  permissionCount: number;
  tenantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionNode {
  key: string;
  label: string;
  module?: string;
  children?: PermissionNode[];
}

export interface TenantPackageInfo {
  tenantId: string;
  packageId: string;
  packageName: string;
  packageCode: string;
}

export interface PlatformTrend {
  date: string;
  enterprises: number;
  users: number;
  pointsGranted: number;
  pointsConsumed: number;
  exchanges: number;
}

export type TrendDimension = 'day' | 'week' | 'month';

export interface EnterpriseRankingItem {
  id: string;
  name: string;
  userCount: number;
  totalPoints: number;
  totalCheckIns: number;
  activeDays: number;
}

export const getPlatformStats = async () => {
  const res = await platformApiClient.get('/stats');
  return res.data;
};

export const getEnterprises = async (params: { page: number; size: number; keyword?: string; status?: string }) => {
  const res = await platformApiClient.get('/tenants', { params });
  return res.data;
};

export const createEnterprise = async (data: {
  name: string;
  contactPhone: string;
  contactName: string;
  packageName?: string;
}) => {
  const res = await platformApiClient.post('/tenants', data);
  return res.data;
};

export const toggleEnterpriseStatus = async (id: string, status: 'active' | 'inactive') => {
  const res = await platformApiClient.put(`/tenants/${id}/status`, { status });
  return res.data;
};

export const getPlatformAdmins = async () => {
  const res = await platformApiClient.get('/admins');
  return res.data;
};

export const createPlatformAdmin = async (data: {
  username: string;
  phone: string;
  password: string;
  email?: string;
  role: string;
}) => {
  const res = await platformApiClient.post('/admins', data);
  return res.data;
};

export const deletePlatformAdmin = async (userId: string) => {
  const res = await platformApiClient.delete(`/admins/${userId}`);
  return res.data;
};

export const updatePlatformAdmin = async (
  userId: string,
  data: {
    username?: string;
    phone?: string;
    email?: string;
    roles?: string[];
    status?: number;
  }
) => {
  const res = await platformApiClient.put(`/admins/${userId}`, data);
  return res.data;
};

export const getOperationLogs = async (params: {
  page: number;
  size: number;
  operatorId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const res = await platformApiClient.get('/logs', { params });
  return res.data;
};

export const getPlatformConfig = async () => {
  const res = await platformApiClient.get('/config');
  return res.data;
};

export const updatePlatformConfig = async (configs: PlatformConfig[]) => {
  const res = await platformApiClient.put('/config', { configs });
  return res.data;
};

export const getEnterpriseRanking = async (limit = 10) => {
  const res = await platformApiClient.get('/enterprise-ranking', { params: { limit } });
  return res.data;
};

// Package management APIs
export const getPackages = async (params?: { page?: number; size?: number; keyword?: string }) => {
  const res = await platformApiClient.get('/packages', { params });
  return res.data;
};

export const getPackage = async (id: string) => {
  const res = await platformApiClient.get(`/packages/${id}`);
  return res.data;
};

export const createPackage = async (data: {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}) => {
  const res = await platformApiClient.post('/packages', data);
  return res.data;
};

export const updatePackage = async (
  id: string,
  data: { name: string; description?: string; status?: number }
) => {
  const res = await platformApiClient.put(`/packages/${id}`, data);
  return res.data;
};

export const deletePackage = async (id: string) => {
  const res = await platformApiClient.delete(`/packages/${id}`);
  return res.data;
};

export const getPackagePermissions = async (id: string) => {
  const res = await platformApiClient.get(`/packages/${id}/permissions`);
  return res.data;
};

export const updatePackagePermissions = async (id: string, permissionCodes: string[]) => {
  const res = await platformApiClient.put(`/packages/${id}/permissions`, { permissionCodes });
  return res.data;
};

export const getPlatformPermissions = async () => {
  const res = await platformApiClient.get('/permissions/all');
  return res.data;
};

// Tenant package binding APIs
export const getTenantPackage = async (tenantId: string) => {
  const res = await platformApiClient.get(`/tenants/${tenantId}/package`);
  return res.data;
};

export const updateTenantPackage = async (tenantId: string, packageId: string) => {
  const res = await platformApiClient.put(`/tenants/${tenantId}/package`, { packageId });
  return res.data;
};

export const getPlatformTrend = async (dimension: TrendDimension = 'day', limit = 30) => {
  const res = await platformApiClient.get('/platform-trend', { params: { dimension, limit } });
  return res.data;
};

export interface EnterpriseUser {
  userId: string;
  username: string;
  phone: string;
  roles: string[];
  roleNames: string[];
  status: 'active' | 'inactive';
  isSuperAdmin: boolean;
  createTime: string;
}

export const getEnterpriseUsers = async (tenantId: string) => {
  const res = await platformApiClient.get(`/tenants/${tenantId}/users`);
  return res.data;
};

export const assignSuperAdmin = async (tenantId: string, userId: string) => {
  const res = await platformApiClient.put(`/tenants/${tenantId}/super-admin`, { userId });
  return res.data;
};

export const exportPlatformReport = async (dimension: TrendDimension, startDate: string, endDate: string) => {
  const res = await platformApiClient.get('/platform-report/export', {
    params: { dimension, startDate, endDate },
    responseType: 'blob',
  });
  return res.data;
};
