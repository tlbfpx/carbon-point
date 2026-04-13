import { request } from '../request';

export interface DailyTrend {
  date: string;
  checkInCount: number;
  newMembers: number;
  totalPointsIssued: number;
  totalPointsExchanged: number;
  exchangeOrderCount: number;
}

export interface TrendParams {
  tenantId?: string;
  startDate: string;
  endDate: string;
  granularity?: 'day' | 'week' | 'month';
}

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  todayActive: number;
  levelDistribution: { level: number; count: number; percentage: number }[];
}

export interface ProductStats {
  totalProducts: number;
  onlineProducts: number;
  topProducts: { productId: string; productName: string; exchangeCount: number; exchangePoints: number }[];
}

export interface PointsStats {
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  monthlyIssued: number;
  monthlyExchanged: number;
  avgCheckInPoints: number;
}

export const reportApi = {
  getDailyTrend: (params: TrendParams) =>
    request.get<DailyTrend[]>('/reports/daily-trend', { params }),

  getMemberStats: (tenantId: string) =>
    request.get<MemberStats>(`/tenants/${tenantId}/reports/members`),

  getProductStats: (tenantId: string, period?: string) =>
    request.get<ProductStats>(`/tenants/${tenantId}/reports/products`, { params: { period } }),

  getPointsStats: (tenantId: string) =>
    request.get<PointsStats>(`/tenants/${tenantId}/reports/points`),

  exportDailyReport: (tenantId: string, startDate: string, endDate: string) =>
    request.get('/reports/export/daily', {
      params: { tenantId, startDate, endDate },
      responseType: 'blob',
    }),

  exportMemberReport: (tenantId: string) =>
    request.get('/reports/export/members', {
      params: { tenantId },
      responseType: 'blob',
    }),

  exportOrderReport: (tenantId: string, startDate: string, endDate: string) =>
    request.get('/reports/export/orders', {
      params: { tenantId, startDate, endDate },
      responseType: 'blob',
    }),
};
