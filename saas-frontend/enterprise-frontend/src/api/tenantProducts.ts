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

export const getTenantProductRules = async (productCode: string) => {
  const res = await apiClient.get(`/tenant/products/${productCode}/rules`);
  return res.data;
};

export const toggleTenantProductRule = async (productCode: string, ruleId: number) => {
  const res = await apiClient.put(`/tenant/products/${productCode}/rules/${ruleId}/toggle`);
  return res.data;
};

export const getTenantBasicConfig = async (productCode: string) => {
  const res = await apiClient.get(`/tenant/products/${productCode}/basic-config`);
  return res.data;
};
