import { apiClient } from './request';

/**
 * Resource type constants
 */
export const RESOURCE_TYPES = {
  FUNCTION_PRODUCT: 'FUNCTION_PRODUCT',
  MALL_PRODUCT: 'MALL_PRODUCT',
  FEATURE: 'FEATURE',
  PERMISSION_GROUP: 'PERMISSION_GROUP',
} as const;

export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];

/**
 * Platform resource interface
 */
export interface PlatformResource {
  id: string;
  code: string;
  type: ResourceType;
  name: string;
  category?: string;
  description?: string;
  metadata?: string;
  icon?: string;
  status?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Package resource interface
 */
export interface PackageResource {
  id: string;
  packageId: string;
  resourceId: string;
  isRequired?: boolean;
  createdAt?: string;
}

/**
 * Tenant resource config interface
 */
export interface TenantResourceConfig {
  id: string;
  tenantId: string;
  resourceId: string;
  isEnabled: boolean;
  config?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get all platform resources (experimental)
 */
export const getPlatformResources = async (params?: {
  type?: ResourceType;
  keyword?: string;
}): Promise<PlatformResource[]> => {
  const res = await apiClient.get('/unified/resources', { params });
  return res.data?.data || [];
};

/**
 * Get a single platform resource by ID
 */
export const getPlatformResource = async (id: string): Promise<PlatformResource> => {
  const res = await apiClient.get(`/unified/resources/${id}`);
  return res.data?.data;
};

/**
 * Create a new platform resource
 */
export const createPlatformResource = async (data: Omit<PlatformResource, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlatformResource> => {
  const res = await apiClient.post('/unified/resources', data);
  return res.data?.data;
};

/**
 * Update an existing platform resource
 */
export const updatePlatformResource = async (id: string, data: Partial<Omit<PlatformResource, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PlatformResource> => {
  const res = await apiClient.put(`/unified/resources/${id}`, data);
  return res.data?.data;
};

/**
 * Delete a platform resource
 */
export const deletePlatformResource = async (id: string): Promise<void> => {
  await apiClient.delete(`/unified/resources/${id}`);
};

/**
 * Get tenant's resource configuration (experimental)
 */
export const getTenantResources = async (): Promise<TenantResourceConfig[]> => {
  const res = await apiClient.get('/unified/tenant-resources');
  return res.data?.data || [];
};

/**
 * Update tenant's resource configuration
 */
export const updateTenantResource = async (id: string, data: Partial<Pick<TenantResourceConfig, 'isEnabled' | 'config'>>): Promise<TenantResourceConfig> => {
  const res = await apiClient.put(`/unified/tenant-resources/${id}`, data);
  return res.data?.data;
};

/**
 * Get package resources
 */
export const getPackageResources = async (packageId: string): Promise<PackageResource[]> => {
  const res = await apiClient.get(`/unified/packages/${packageId}/resources`);
  return res.data?.data || [];
};

/**
 * Add resource to package
 */
export const addResourceToPackage = async (packageId: string, resourceId: string, isRequired: boolean = false): Promise<PackageResource> => {
  const res = await apiClient.post(`/unified/packages/${packageId}/resources`, { resourceId, isRequired });
  return res.data?.data;
};

/**
 * Remove resource from package
 */
export const removeResourceFromPackage = async (packageId: string, resourceId: string): Promise<void> => {
  await apiClient.delete(`/unified/packages/${packageId}/resources/${resourceId}`);
};
