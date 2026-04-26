import { apiClient } from './request';
import { Result } from './types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  points: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  list: LeaderboardEntry[];
  total: number;
  currentUserRank?: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type LeaderboardDimension = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'history';

/**
 * Get leaderboard data by dimension.
 * Calls the unified GET /v1/leaderboard endpoint with dimension param.
 */
export const getLeaderboard = async (
  dimension: LeaderboardDimension = 'daily',
  page: number = 1,
  pageSize: number = 20
): Promise<Result<LeaderboardResponse>> => {
  const res = await apiClient.get<Result<LeaderboardResponse>>('/v1/leaderboard', {
    params: { dimension, page, pageSize },
  });
  return res.data;
};
