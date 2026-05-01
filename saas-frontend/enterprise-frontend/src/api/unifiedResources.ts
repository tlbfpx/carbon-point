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
 * Get tenant's resource configuration (experimental)
 */
export const getTenantResources = async (): Promise<PlatformResource[]> => {
  const res = await apiClient.get('/unified/tenant-resources');
  return res.data?.data || [];
};
