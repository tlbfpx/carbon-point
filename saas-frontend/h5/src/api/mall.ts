import { apiClient } from './request';

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
}

export interface Product {
  id: string;
  shelfId: number;
  platformMallProductId: number;
  name: string;
  description: string;
  pointsPrice: number;
  stock: number | null;
  type: 'coupon' | 'recharge' | 'privilege';
  imageUrl?: string;
  fulfillmentConfig?: string;
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

// ================ 新货架系统API ================

export const getProducts = async (
  tenantId: string,
  type?: string
): Promise<ApiResponse<Product[]>> => {
  const res = await apiClient.get('/mall/products', {
    params: { type },
  });
  return res.data;
};

export const getProductDetail = async (shelfItemId: string): Promise<ApiResponse<Product>> => {
  const res = await apiClient.get(`/mall/products/${shelfItemId}`);
  return res.data;
};

// ================ 旧API（保留兼容性） ================

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
