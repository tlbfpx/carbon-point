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

export const getDashboardStats = async (_tenantId: string): Promise<DashboardStats> => {
  const res = await apiClient.get('/reports/dashboard/stats') as { data?: DashboardStats };
  return res.data as DashboardStats;
};

export const getCheckInTrend = async (_tenantId: string, days = 7) => {
  const res = await apiClient.get('/reports/dashboard/checkin-trend', {
    params: { days },
  });
  return res;
};

export const getPointsTrend = async (_tenantId: string, days = 7) => {
  const res = await apiClient.get('/reports/dashboard/points-trend', {
    params: { days },
  });
  return res;
};

export const getHotProducts = async (_tenantId: string, limit = 5) => {
  const res = await apiClient.get('/reports/dashboard/hot-products', {
    params: { limit },
  });
  return res;
};

export const exportReport = async (_tenantId: string, type: string, startDate: string, endDate: string): Promise<Blob> => {
  const res = await apiClient.get('/reports/export', {
    params: { type, startDate, endDate },
    responseType: 'blob',
  });
  return res as unknown as Blob;
};

// Multi-product dashboard types
export interface ProductTodayStats {
  productCode: string;
  productName: string;
  todayUserCount: number;
  todayPointsIssued: number;
}

export interface ProductPointSlice {
  productCode: string;
  productName: string;
  points: number;
  percentage: number;
  participationRate: number;
  activeUsers: number;
}

export interface CrossProductOverview {
  slices: ProductPointSlice[];
  totalPoints: number;
  participationRates: Record<string, number>;
  overallParticipationRate: number;
}

export interface ProductDailyStat {
  date: string;
  points: number;
  count: number;
}

export interface ProductStats {
  productCode: string;
  productName: string;
  totalPointsIssued: number;
  transactionCount: number;
  dailyStats: ProductDailyStat[];
}

export interface ProductValue {
  productCode: string;
  productName: string;
  points: number;
}

export interface ProductTrendPoint {
  period: string;
  productValues: ProductValue[];
  totalPoints: number;
}

export interface ProductTrendData {
  dimension: string;
  points: ProductTrendPoint[];
}

export interface EnterpriseDashboardData {
  todayCheckinCount: number;
  todayPointsIssued: number;
  weekTrend: Array<{ date: string; checkinCount: number; pointsIssued: number }>;
  activeUsersWeek: number;
  activeUsersMonth: number;
  topProducts: Array<{ productId: number; productName: string; exchangeCount: number }>;
  productTodayStats?: Map<string, ProductTodayStats>;
  productPointsDistribution?: ProductPointSlice[];
}

export const getEnterpriseDashboard = async (_tenantId: string): Promise<EnterpriseDashboardData> => {
  const res = await apiClient.get('/reports/enterprise/dashboard') as { data?: EnterpriseDashboardData };
  return res.data as EnterpriseDashboardData;
};

export const getEnterpriseProductTrend = async (_tenantId: string, dimension = 'day', limit = 30): Promise<ProductTrendData> => {
  const res = await apiClient.get('/reports/enterprise/product-trend', {
    params: { dimension, limit },
  }) as { data?: ProductTrendData };
  return res.data as ProductTrendData;
};

export const getCrossProductOverview = async (start?: string, end?: string): Promise<CrossProductOverview> => {
  const res = await apiClient.get('/reports/product-overview', {
    params: { start, end },
  }) as { data?: CrossProductOverview };
  return res.data as CrossProductOverview;
};

export const getProductStats = async (start?: string, end?: string): Promise<ProductStats[]> => {
  const res = await apiClient.get('/reports/product-stats', {
    params: { start, end },
  }) as { data?: ProductStats[] };
  return res.data ?? [];
};
