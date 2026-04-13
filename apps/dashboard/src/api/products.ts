import { apiClient } from './request';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: 'coupon' | 'recharge' | 'privilege';
  pointsCost: number;
  stock: number;
  limitPerUser?: number;
  validityDays: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  createTime: string;
}

export interface CreateProductParams {
  name: string;
  description: string;
  type: 'coupon' | 'recharge' | 'privilege';
  pointsCost: number;
  stock: number;
  limitPerUser?: number;
  validityDays: number;
  imageUrl?: string;
  distributionConfig?: Record<string, string>;
  tenantId: string;
}

export interface ProductQuery {
  page: number;
  size: number;
  type?: string;
  keyword?: string;
}

export const getProducts = async (params: ProductQuery) => {
  const res = await apiClient.get('/mall/products', { params });
  return res.data;
};

export const getProductById = async (id: string) => {
  const res = await apiClient.get(`/mall/products/${id}`);
  return res.data;
};

export const createProduct = async (data: CreateProductParams) => {
  const res = await apiClient.post('/mall/products', data);
  return res.data;
};

export const updateProduct = async (id: string, data: Partial<CreateProductParams>) => {
  const res = await apiClient.put(`/mall/products/${id}`, data);
  return res.data;
};

export const toggleProductStatus = async (id: string, status: 'active' | 'inactive') => {
  const res = await apiClient.put(`/mall/products/${id}/status`, { status });
  return res.data;
};

export const updateStock = async (id: string, stock: number) => {
  const res = await apiClient.put(`/mall/products/${id}/stock`, { stock });
  return res.data;
};
