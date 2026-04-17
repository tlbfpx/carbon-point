import { apiClient } from './request';
import { Result } from './types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  points: number;
  avatar?: string;
}

export interface LeaderboardResponse {
  list: LeaderboardEntry[];
  total: number;
}

type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'history';

/**
 * Get leaderboard data
 */
export const getLeaderboard = async (
  type: LeaderboardType = 'history'
): Promise<Result<LeaderboardResponse>> => {
  const res = await apiClient.get<Result<LeaderboardResponse>>('/points/leaderboard', {
    params: { type },
  });
  return res.data;
};
