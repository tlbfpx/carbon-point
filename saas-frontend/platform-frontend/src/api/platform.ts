import { platformApiClient } from './request';

export interface Enterprise {
  id: string;
  name: string;
  contactPhone: string;
  contactName: string;
  contactEmail?: string;
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
  status: number | boolean;
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
  contactEmail?: string;
  packageId?: string;
  packageName?: string;
  createSuperAdmin?: boolean;
  superAdminUsername?: string;
  superAdminPhone?: string;
  superAdminPassword?: string;
}) => {
  const res = await platformApiClient.post('/tenants', data);
  return res.data;
};

export const suspendEnterprise = async (id: string) => {
  const res = await platformApiClient.put(`/tenants/${id}/suspend`);
  return res.data;
};

export const activateEnterprise = async (id: string) => {
  const res = await platformApiClient.put(`/tenants/${id}/activate`);
  return res.data;
};

export const deleteEnterprise = async (id: string) => {
  const res = await platformApiClient.delete(`/tenants/${id}`);
  return res.data;
};

export const getPlatformAdmins = async () => {
  const res = await platformApiClient.get('/admins', { params: { pageSize: 500 } });
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
    newPassword?: string;
  }
) => {
  const res = await platformApiClient.put(`/admins/${userId}`, data);
  return res.data;
};

export const getOperationLogs = async (params: {
  page: number;
  size: number;
  adminId?: string;
  operationType?: string;
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
  const res = await platformApiClient.get('/permissions/tree');
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
  const res = await platformApiClient.get('/report/export', {
    params: { dimension, startDate, endDate },
    responseType: 'blob',
  });
  return res.data;
};

// Product and Feature Management APIs
export interface Product {
  id: string;
  code: string;
  name: string;
  category: 'stairs_climbing' | 'walking';
  description?: string;
  status: number;
  sortOrder: number;
  featureCount: number;
  triggerType?: string;
  ruleChainConfig?: string;
  defaultConfig?: string;
  basicConfig?: string;
  createTime: string;
  updateTime: string;
}

export interface RuleTemplate {
  id: string;
  productId: string;
  ruleType: string;
  name: string;
  config: string;
  enabled: boolean;
  sortOrder: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BasicConfig {
  point_params: Record<string, any>;
  behavior_params: Record<string, any>;
}

export interface Feature {
  id: string;
  code: string;
  name: string;
  type: 'permission' | 'config';
  valueType?: 'boolean' | 'number' | 'string' | 'json';
  defaultValue?: string;
  description?: string;
  group?: string;
  createTime: string;
  updateTime: string;
}

export interface ProductFeature {
  id: string;
  productId: string;
  featureId: string;
  featureCode: string;
  featureName: string;
  featureType: string;
  valueType: string;
  defaultValue?: string;
  configValue?: string;
  isRequired: boolean;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageProduct {
  productId: string;
  productCode: string;
  productName: string;
  productCategory: string;
  productStatus: number;
  sortOrder: number;
  features?: PackageProductFeature[];
}

export interface PackageProductFeature {
  featureId: string;
  featureCode: string;
  featureName: string;
  featureType: string;
  valueType: string;
  configValue?: string;
  isEnabled: boolean;
  isCustomized: boolean;
  productDefaultValue?: string;
  systemDefaultValue?: string;
}

export interface PackageDetail extends PermissionPackage {
  products?: PackageProduct[];
}

export interface PackageSummary {
  id: string;
  code: string;
  name: string;
  status: number;
}

// Product APIs
export const getProducts = async (params?: { page?: number; size?: number; category?: string; status?: number; keyword?: string }) => {
  const res = await platformApiClient.get('/products', { params });
  return res.data;
};

export const getProduct = async (id: string) => {
  const res = await platformApiClient.get(`/products/${id}`);
  return res.data;
};

export const createProduct = async (data: {
  code: string;
  name: string;
  category: string;
  description?: string;
  status?: number;
  sortOrder?: number;
  triggerType?: string;
  ruleChainConfig?: string;
  defaultConfig?: string;
  features?: string[];
}) => {
  const res = await platformApiClient.post('/products', data);
  return res.data;
};

export const updateProduct = async (
  id: string,
  data: { name?: string; description?: string; status?: number; sortOrder?: number }
) => {
  const res = await platformApiClient.put(`/products/${id}`, data);
  return res.data;
};

export const deleteProduct = async (id: string) => {
  const res = await platformApiClient.delete(`/products/${id}`);
  return res.data;
};

export const getProductPackages = async (productId: string) => {
  const res = await platformApiClient.get(`/products/${productId}/packages`);
  return res.data;
};

// Product Feature APIs
export const getProductFeatures = async (productId: string) => {
  const res = await platformApiClient.get(`/products/${productId}/features`);
  return res.data;
};

export const updateProductFeatures = async (productId: string, features: { featureId: string; configValue?: string; isRequired: boolean; isEnabled: boolean }[]) => {
  const res = await platformApiClient.put(`/products/${productId}/features`, { features });
  return res.data;
};

// Feature Library APIs
export const getFeatures = async (params?: { page?: number; size?: number; type?: string; group?: string; keyword?: string }) => {
  const res = await platformApiClient.get('/features', { params });
  return res.data;
};

export const getFeature = async (id: string) => {
  const res = await platformApiClient.get(`/features/${id}`);
  return res.data;
};

export const createFeature = async (data: {
  code: string;
  name: string;
  type: string;
  valueType?: string;
  defaultValue?: string;
  description?: string;
  group?: string;
}) => {
  const res = await platformApiClient.post('/features', data);
  return res.data;
};

export const updateFeature = async (
  id: string,
  data: { name?: string; description?: string; group?: string; defaultValue?: string }
) => {
  const res = await platformApiClient.put(`/features/${id}`, data);
  return res.data;
};

export const deleteFeature = async (id: string) => {
  const res = await platformApiClient.delete(`/features/${id}`);
  return res.data;
};

// Extended Package APIs with product-feature support
export const getPackageDetail = async (id: string) => {
  const res = await platformApiClient.get(`/packages/${id}/detail`);
  return res.data;
};

// Tenant Product APIs
export interface TenantProductInfo {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  featureConfig: Record<string, string>;
}

export const getTenantProducts = async (tenantId: string) => {
  const res = await platformApiClient.get(`/tenants/${tenantId}/products`);
  return res.data;
};

// System Management APIs
export interface OperationLog {
  id: string;
  adminId: string;
  adminName: string;
  adminRole?: string;
  operationType: string;
  operationObject?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestParams?: string;
  responseResult?: string;
  ipAddress?: string;
  userAgent?: string;
  executionTime?: number;
  createdAt: string;
}

export interface DictItem {
  id: string;
  dictType: string;
  dictCode: string;
  dictName: string;
  status: number;
  sortOrder: number;
  remark?: string;
  createTime: string;
  updateTime: string;
}

export interface PlatformRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: number;
  permissionCount: number;
  createTime: string;
  updateTime: string;
}

export const getDictItems = async (params?: { page?: number; size?: number; dictType?: string; status?: number; keyword?: string }) => {
  const res = await platformApiClient.get('/dict-items', { params });
  return res.data;
};

export const createDictItem = async (data: {
  dictType: string;
  dictCode: string;
  dictName: string;
  status?: number;
  sortOrder?: number;
  remark?: string;
}) => {
  const res = await platformApiClient.post('/dict-items', data);
  return res.data;
};

export const updateDictItem = async (
  id: string,
  data: { dictName?: string; status?: number; sortOrder?: number; remark?: string }
) => {
  const res = await platformApiClient.put(`/dict-items/${id}`, data);
  return res.data;
};

export const deleteDictItem = async (id: string) => {
  const res = await platformApiClient.delete(`/dict-items/${id}`);
  return res.data;
};

export const getPlatformRoles = async () => {
  const res = await platformApiClient.get('/roles');
  return res.data;
};

export const createPlatformRole = async (data: {
  code: string;
  name: string;
  description?: string;
  permissionCodes?: string[];
}) => {
  const res = await platformApiClient.post('/roles', data);
  return res.data;
};

export const updatePlatformRole = async (
  id: string,
  data: { name?: string; description?: string; status?: number }
) => {
  const res = await platformApiClient.put(`/roles/${id}`, data);
  return res.data;
};

export const deletePlatformRole = async (id: string) => {
  const res = await platformApiClient.delete(`/roles/${id}`);
  return res.data;
};

export const getPlatformRolePermissions = async (id: string) => {
  const res = await platformApiClient.get(`/roles/${id}/permissions`);
  return res.data;
};

export const updatePlatformRolePermissions = async (id: string, permissionCodes: string[]) => {
  const res = await platformApiClient.put(`/roles/${id}/permissions`, { permissionCodes });
  return res.data;
};

// Registry APIs - SPI component discovery
export interface TriggerInfo {
  id: string;
  type: string;
  name: string;
  productCode: string;
  description: string;
}

export interface RuleNodeInfo {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface FeatureInfo {
  type: string;
  name: string;
  required: boolean;
  defaultConfig: Record<string, unknown>;
}

export interface RegistryModule {
  code: string;
  name: string;
  triggerType: string;
  ruleChain: string[];
  features: string[];
  trigger: TriggerInfo;
  ruleNodes: RuleNodeInfo[];
  featureDetails: FeatureInfo[];
}

export const getRegistryModules = async () => {
  const res = await platformApiClient.get('/registry/modules');
  return res.data;
};

export const getRegistryModule = async (code: string) => {
  const res = await platformApiClient.get(`/registry/modules/${code}`);
  return res.data;
};

export const getRegistryTriggers = async () => {
  const res = await platformApiClient.get('/registry/triggers');
  return res.data;
};

export const getRegistryRuleNodes = async () => {
  const res = await platformApiClient.get('/registry/rule-nodes');
  return res.data;
};

export const getRegistryFeatures = async () => {
  const res = await platformApiClient.get('/registry/features');
  return res.data;
};

// Trigger Type CRUD
export interface TriggerType {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const createTriggerType = async (data: { code: string; name: string; description?: string; sortOrder?: number }) => {
  const res = await platformApiClient.post('/registry/triggers', data);
  return res.data;
};

export const updateTriggerType = async (id: string, data: { name?: string; description?: string; sortOrder?: number }) => {
  const res = await platformApiClient.put(`/registry/triggers/${id}`, data);
  return res.data;
};

export const deleteTriggerType = async (id: string) => {
  const res = await platformApiClient.delete(`/registry/triggers/${id}`);
  return res.data;
};

// Rule Node Type CRUD
export interface RuleNodeType {
  id: string;
  code: string;
  name: string;
  description?: string;
  beanName: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const createRuleNodeType = async (data: { code: string; name: string; description?: string; beanName: string; sortOrder?: number }) => {
  const res = await platformApiClient.post('/registry/rule-nodes', data);
  return res.data;
};

export const updateRuleNodeType = async (id: string, data: { name?: string; description?: string; beanName?: string; sortOrder?: number }) => {
  const res = await platformApiClient.put(`/registry/rule-nodes/${id}`, data);
  return res.data;
};

export const deleteRuleNodeType = async (id: string) => {
  const res = await platformApiClient.delete(`/registry/rule-nodes/${id}`);
  return res.data;
};

// Basic Config APIs
export const getBasicConfig = async (productId: string): Promise<any> => {
  const res = await platformApiClient.get(`/products/${productId}/basic-config`);
  return res.data;
};

export const updateBasicConfig = async (productId: string, config: string): Promise<any> => {
  const res = await platformApiClient.put(`/products/${productId}/basic-config`, { basicConfig: config });
  return res.data;
};

// Rule Template APIs
export const getRuleTemplates = async (productId: string): Promise<RuleTemplate[]> => {
  const res = await platformApiClient.get(`/products/${productId}/rule-templates`);
  return res.data;
};

export const createRuleTemplate = async (productId: string, data: any): Promise<RuleTemplate> => {
  const res = await platformApiClient.post(`/products/${productId}/rule-templates`, data);
  return res.data;
};

export const updateRuleTemplate = async (productId: string, templateId: string, data: any): Promise<RuleTemplate> => {
  const res = await platformApiClient.put(`/products/${productId}/rule-templates/${templateId}`, data);
  return res.data;
};

export const deleteRuleTemplate = async (productId: string, templateId: string): Promise<any> => {
  const res = await platformApiClient.delete(`/products/${productId}/rule-templates/${templateId}`);
  return res.data;
};
