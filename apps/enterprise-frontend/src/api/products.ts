import { apiClient } from './request';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: 'coupon' | 'recharge' | 'privilege';
  pointsPrice: number;
  stock: number;
  maxPerUser?: number;
  validityDays: number;
  status: 'active' | 'inactive';
  image?: string;
  createdAt: string;
}

export interface CreateProductParams {
  name: string;
  description?: string;
  type: 'coupon' | 'recharge' | 'privilege';
  pointsPrice: number;
  stock: number;
  maxPerUser?: number;
  validityDays: number;
  image?: string;
  fulfillmentConfig?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export interface ProductQuery {
  page: number;
  size: number;
  type?: string;
  keyword?: string;
  status?: string;
}

export const getProducts = async (params: ProductQuery) => {
  // Backend defaults to status=active if not provided; include status param if explicitly set
  const queryParams = { ...params };
  if (!queryParams.status) {
    queryParams.status = 'active';
  }
  const res = await apiClient.get('/products', { params: queryParams });
  return res.data;
};

export const getProductById = async (id: string) => {
  const res = await apiClient.get(`/products/${id}`);
  return res.data;
};

export const createProduct = async (data: CreateProductParams) => {
  const res = await apiClient.post('/products', data);
  return res.data;
};

export const updateProduct = async (id: string, data: Partial<CreateProductParams>) => {
  const res = await apiClient.put(`/products/${id}`, data);
  return res.data;
};

export const toggleProductStatus = async (id: string, _status: 'active' | 'inactive') => {
  const res = await apiClient.put(`/products/${id}/toggle`);
  return res.data;
};

export const updateStock = async (id: string, stock: number) => {
  const res = await apiClient.put(`/products/${id}/stock`, { delta: stock });
  return res.data;
};
