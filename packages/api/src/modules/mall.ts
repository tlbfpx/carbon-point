import { request, PageResult } from '../request';

export type ProductType = 'coupon' | 'recharge' | 'privilege';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  pointsCost: number;
  stock: number;
  imageUrl?: string;
  enabled: boolean;
  createTime: string;
}

export interface CreateProductParams {
  name: string;
  description: string;
  type: ProductType;
  pointsCost: number;
  stock: number;
  imageUrl?: string;
}

export interface UpdateProductParams {
  name?: string;
  description?: string;
  pointsCost?: number;
  stock?: number;
  imageUrl?: string;
  enabled?: boolean;
}

export type OrderStatus = 'pending' | 'fulfilled' | 'used' | 'expired' | 'cancelled';

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  username: string;
  productId: string;
  productName: string;
  pointsCost: number;
  status: OrderStatus;
  extraInfo?: Record<string, string>;
  createTime: string;
  fulfillTime?: string;
  useTime?: string;
  expireTime?: string;
}

export interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export interface ExchangeParams {
  tenantId: string;
  userId: string;
  productId: string;
  extraInfo?: Record<string, string>;
}

export interface Coupon {
  id: string;
  name: string;
  code?: string;
  productId: string;
  productName: string;
  status: 'available' | 'used' | 'expired';
  userId: string;
  orderId: string;
  expireTime: string;
  useTime?: string;
}

export const mallApi = {
  // Product management
  listProducts: (tenantId: string, params?: { page?: number; pageSize?: number; type?: ProductType; keyword?: string }) =>
    request.get<PageResult<Product>>('/mall/products', { params: { tenantId, ...params } }),

  getProduct: (productId: string) =>
    request.get<Product>(`/mall/products/${productId}`),

  createProduct: (tenantId: string, params: CreateProductParams) =>
    request.post<Product>(`/tenants/${tenantId}/mall/products`, params),

  updateProduct: (tenantId: string, productId: string, params: UpdateProductParams) =>
    request.put<Product>(`/tenants/${tenantId}/mall/products/${productId}`, params),

  deleteProduct: (tenantId: string, productId: string) =>
    request.delete<void>(`/tenants/${tenantId}/mall/products/${productId}`),

  // Order management
  listOrders: (tenantId: string, params?: OrderQueryParams) =>
    request.get<PageResult<Order>>('/mall/orders', { params: { tenantId, ...params } }),

  getOrder: (orderId: string) =>
    request.get<Order>(`/mall/orders/${orderId}`),

  fulfillOrder: (orderId: string) =>
    request.put<Order>(`/mall/orders/${orderId}/fulfill`),

  cancelOrder: (orderId: string) =>
    request.put<Order>(`/mall/orders/${orderId}/cancel`),

  // User exchange
  exchange: (params: ExchangeParams) =>
    request.post<{ orderId: string; orderNo: string }>('/mall/exchange', params),

  getMyOrders: (userId: string, params?: { page?: number; pageSize?: number; status?: OrderStatus }) =>
    request.get<PageResult<Order>>('/mall/my-orders', { params: { userId, ...params } }),

  getMyCoupons: (userId: string, params?: { status?: 'available' | 'used' | 'expired' }) =>
    request.get<Coupon[]>('/mall/my-coupons', { params: { userId, ...params } }),
};
