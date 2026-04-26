import { platformApiClient } from './request';

// Platform Mall Product — virtual goods in the platform product pool
export interface PlatformMallProduct {
  id: string;
  name: string;
  type: 'coupon' | 'recharge' | 'privilege';
  description?: string;
  price: number; // RMB cents
  image?: string;
  status: 'active' | 'inactive';
  stock?: number;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformMallProductParams {
  name: string;
  type: 'coupon' | 'recharge' | 'privilege';
  description?: string;
  price: number;
  image?: string;
  status?: 'active' | 'inactive';
  stock?: number;
  sortOrder?: number;
}

export interface UpdatePlatformMallProductParams {
  name?: string;
  type?: 'coupon' | 'recharge' | 'privilege';
  description?: string;
  price?: number;
  image?: string;
  status?: 'active' | 'inactive';
  stock?: number;
  sortOrder?: number;
}

export interface PlatformMallProductQuery {
  page?: number;
  size?: number;
  type?: string;
  keyword?: string;
  status?: string;
}

// Fetch paginated platform mall products
export const getPlatformMallProducts = async (params?: PlatformMallProductQuery) => {
  const res = await platformApiClient.get('/mall/products', { params });
  return res.data;
};

// Get a single platform mall product
export const getPlatformMallProduct = async (id: string) => {
  const res = await platformApiClient.get(`/mall/products/${id}`);
  return res.data;
};

// Create a new platform mall product
export const createPlatformMallProduct = async (data: CreatePlatformMallProductParams) => {
  const res = await platformApiClient.post('/mall/products', data);
  return res.data;
};

// Update a platform mall product
export const updatePlatformMallProduct = async (id: string, data: UpdatePlatformMallProductParams) => {
  const res = await platformApiClient.put(`/mall/products/${id}`, data);
  return res.data;
};

// Toggle platform mall product status (active/inactive)
export const togglePlatformMallProductStatus = async (id: string) => {
  const res = await platformApiClient.put(`/mall/products/${id}/toggle`);
  return res.data;
};

// Delete a platform mall product
export const deletePlatformMallProduct = async (id: string) => {
  const res = await platformApiClient.delete(`/mall/products/${id}`);
  return res.data;
};
