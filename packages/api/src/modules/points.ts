import { request, PageResult } from '../request';

export interface PointsAccount {
  id: string;
  userId: string;
  tenantId: string;
  totalPoints: number;
  frozenPoints: number;
  availablePoints: number;
  level: number;
  levelName: string;
  consecutiveDays: number;
}

export interface PointsHistory {
  id: string;
  userId: string;
  tenantId: string;
  points: number;
  type: 'checkin' | 'order' | 'adjust' | 'expire' | 'refund';
  description: string;
  frozen: boolean;
  createTime: string;
}

export interface PointsHistoryParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  totalPoints: number;
  level: number;
  consecutiveDays: number;
}

export interface AdjustPointsParams {
  userId: string;
  tenantId: string;
  points: number;
  reason: string;
}

export const pointsApi = {
  getAccount: (tenantId: string, userId: string) =>
    request.get<PointsAccount>('/points/account', { params: { tenantId, userId } }),

  getHistory: (tenantId: string, params?: PointsHistoryParams) =>
    request.get<PageResult<PointsHistory>>('/points/history', { params: { tenantId, ...params } }),

  getLeaderboard: (tenantId: string, period?: 'day' | 'week' | 'month' | 'all') =>
    request.get<LeaderboardEntry[]>('/points/leaderboard', { params: { tenantId, period } }),

  adjustPoints: (params: AdjustPointsParams) =>
    request.post<void>('/points/adjust', params),

  batchAdjust: (tenantId: string, adjustments: AdjustPointsParams[]) =>
    request.post<void>('/points/batch-adjust', { tenantId, adjustments }),

  getDailyStats: (tenantId: string, date: string) =>
    request.get<{
      date: string;
      totalPointsIssued: number;
      totalPointsExchanged: number;
      totalCheckIn: number;
    }>('/points/daily-stats', { params: { tenantId, date } }),

  getMonthlyReport: (tenantId: string, year: number, month: number) =>
    request.get<{
      totalPointsIssued: number;
      totalPointsExchanged: number;
      avgCheckInRate: number;
      topProducts: { productId: string; productName: string; count: number }[];
    }>('/points/monthly-report', { params: { tenantId, year, month } }),
};
