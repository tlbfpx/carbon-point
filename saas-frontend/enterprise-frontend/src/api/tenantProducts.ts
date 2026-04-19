import { apiClient } from './request';

export interface TenantProduct {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  featureConfig: Record<string, string>;
}

export const getTenantProducts = async (): Promise<TenantProduct[]> => {
  const res = await apiClient.get('/tenant/products');
  return (res as any)?.data || [];
};
