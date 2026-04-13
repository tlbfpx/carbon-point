import { apiClient } from './request';

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  pointsPrice: number;
  stock: number | null;
  type: 'coupon' | 'recharge' | 'privilege';
  imageUrl?: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  pointsCost: number;
  status: 'pending' | 'fulfilled' | 'used' | 'expired' | 'cancelled';
  createTime: string;
}

export interface Coupon {
  id: string;
  name: string;
  code?: string;
  status: 'available' | 'used' | 'expired';
  expireTime: string;
}

export const getProducts = async (
  tenantId: string,
  type?: string
): Promise<ApiResponse<{ records: Product[]; total: number }>> => {
  const res = await apiClient.get('/products', {
    params: { tenantId, type },
  });
  return res.data;
};

export const getProductDetail = async (productId: string): Promise<ApiResponse<Product>> => {
  const res = await apiClient.get(`/products/${productId}`);
  // Backend returns { code, data: { id, pointsPrice, ... } }
  // Unwrap so callers get product directly
  const payload = res.data;
  if (payload?.data && !Array.isArray(payload.data)) {
    return { code: payload.code, data: payload.data as Product };
  }
  return payload as ApiResponse<Product>;
};

export const exchangeProduct = async (params: {
  tenantId: string;
  userId: string;
  productId: string;
  extraInfo?: Record<string, string>;
}): Promise<ApiResponse<Order>> => {
  const res = await apiClient.post('/exchanges', params);
  return res.data;
};

export const getMyOrders = async (userId: string): Promise<ApiResponse<Order[]>> => {
  const res = await apiClient.get('/exchanges/orders', { params: { userId } });
  return res.data;
};

export const getMyCoupons = async (userId: string, status?: string): Promise<ApiResponse<Coupon[]>> => {
  const res = await apiClient.get('/exchanges/coupons', { params: { userId, status } });
  return res.data;
};
