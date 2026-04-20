import { apiClient } from './request';

export interface ProductFeatureConfig {
  [key: string]: string;
}

export interface TenantProduct {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  featureConfig: ProductFeatureConfig;
}

/**
 * Get the current tenant's available products.
 * GET /api/tenant/products
 */
export const getTenantProducts = async (): Promise<{ code: number; data: TenantProduct[]; message?: string }> => {
  const res = await apiClient.get('/tenant/products');
  return res.data;
};
