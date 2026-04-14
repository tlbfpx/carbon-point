import { apiClient } from './request';

export interface PointsAccount {
  id: string;
  userId: string;
  tenantId: string;
  totalPoints: number;
  frozenPoints: number;
  availablePoints: number;
  level: number;
}

export interface PointsHistoryItem {
  id: string;
  userId: string;
  points: number;
  type: string;
  description?: string;
  createTime: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  nickname: string;
  avatar?: string;
  points: number;
  isCurrentUser: boolean;
}

export interface LeaderboardContext {
  currentRank?: number;
  changeFromLastWeek?: number;
  percentile?: number;
}

export const getPointsAccount = async (tenantId: string, userId: string): Promise<{ data: PointsAccount }> => {
  const res = await apiClient.get('/points/account', { params: { tenantId, userId } });
  return res.data;
};

export const getPointsHistory = async (tenantId: string, userId: string): Promise<{ data: PointsHistoryItem[] }> => {
  const res = await apiClient.get('/points/transactions', { params: { tenantId, userId } });
  // Backend returns MyBatis-Plus Page with {records: [], total: ...}
  // Unwrap to array so callers can use .slice() directly
  const payload = res.data;
  if (payload?.data?.records) {
    return { data: payload.data.records as PointsHistoryItem[] };
  }
  // Fallback: treat data as array or empty
  return { data: Array.isArray(payload?.data) ? payload.data : [] };
};

export const getLeaderboardHistory = async (): Promise<{ data: { list: LeaderboardEntry[]; currentUserRank?: number } }> => {
  const res = await apiClient.get('/v1/leaderboard/history', { params: { page: 1, pageSize: 20 } });
  return res.data;
};

export const getLeaderboardContext = async (): Promise<{ data: LeaderboardContext }> => {
  const res = await apiClient.get('/v1/leaderboard/context');
  return res.data;
};
