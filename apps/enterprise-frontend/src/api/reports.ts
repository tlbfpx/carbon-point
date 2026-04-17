import { apiClient } from './request';

export interface CheckInTrend {
  date: string;
  count: number;
  totalPoints: number;
}

export interface PointsTrend {
  date: string;
  granted: number;
  consumed: number;
}

export interface HotProduct {
  productId: string;
  productName: string;
  exchangeCount: number;
  totalPoints: number;
}

export interface DashboardStats {
  todayCheckInCount: number;
  todayPointsGranted: number;
  activeUsers: number;
  monthExchangeCount: number;
}

export const getDashboardStats = async (_tenantId: string) => {
  const res = await apiClient.get('/reports/dashboard/stats');
  return res.data;
};

export const getCheckInTrend = async (_tenantId: string, days = 7) => {
  const res = await apiClient.get('/reports/dashboard/checkin-trend', {
    params: { days },
  });
  return res.data;
};

export const getPointsTrend = async (_tenantId: string, days = 7) => {
  const res = await apiClient.get('/reports/dashboard/points-trend', {
    params: { days },
  });
  return res.data;
};

export const getHotProducts = async (_tenantId: string, limit = 5) => {
  const res = await apiClient.get('/reports/dashboard/hot-products', {
    params: { limit },
  });
  return res.data;
};

export const exportReport = async (_tenantId: string, type: string, startDate: string, endDate: string) => {
  const res = await apiClient.get('/reports/export', {
    params: { type, startDate, endDate },
    responseType: 'blob',
  });
  return res.data;
};
