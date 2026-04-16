import { apiClient } from './request';

export interface Order {
  id: string;
  userId: string;
  username: string;
  phone: string;
  productId: string;
  productName: string;
  productType: 'coupon' | 'recharge' | 'privilege';
  pointsCost: number;
  status: 'pending' | 'fulfilled' | 'used' | 'expired' | 'cancelled';
  couponCode?: string;
  createTime: string;
  updateTime: string;
}

export interface OrderQuery {
  page: number;
  size: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export const getOrders = async (params: OrderQuery) => {
  const res = await apiClient.get('/exchanges/admin/orders', { params });
  return res.data;
};

export const verifyOrder = async (orderId: string) => {
  const res = await apiClient.post(`/exchanges/admin/orders/${orderId}/verify`);
  return res.data;
};

export const cancelOrder = async (orderId: string) => {
  const res = await apiClient.put(`/exchanges/admin/orders/${orderId}/cancel`);
  return res.data;
};

export const exportOrders = async (_params: OrderQuery) => {
  const res = await apiClient.get('/reports/export', {
    params: { type: 'orders' },
    responseType: 'blob',
  });
  return res.data;
};
