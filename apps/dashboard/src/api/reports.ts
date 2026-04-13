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

export const getDashboardStats = async (tenantId: string) => {
  const res = await apiClient.get('/report/dashboard/stats', { params: { tenantId } });
  return res.data;
};

export const getCheckInTrend = async (tenantId: string, days = 7) => {
  const res = await apiClient.get('/report/dashboard/checkin-trend', {
    params: { tenantId, days },
  });
  return res.data;
};

export const getPointsTrend = async (tenantId: string, days = 7) => {
  const res = await apiClient.get('/report/dashboard/points-trend', {
    params: { tenantId, days },
  });
  return res.data;
};

export const getHotProducts = async (tenantId: string, limit = 5) => {
  const res = await apiClient.get('/report/dashboard/hot-products', {
    params: { tenantId, limit },
  });
  return res.data;
};

export const exportReport = async (tenantId: string, type: string, startDate: string, endDate: string) => {
  const res = await apiClient.get('/report/export', {
    params: { tenantId, type, startDate, endDate },
    responseType: 'blob',
  });
  return res.data;
};
