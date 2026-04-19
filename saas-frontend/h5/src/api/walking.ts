import { apiClient } from './request';

export interface FunEquivalence {
  name: string;
  icon: string;
  quantity: number;
}

export interface WalkingStatus {
  todaySteps: number;
  stepsThreshold: number;
  claimablePoints: number;
  claimed: boolean;
  funEquivalences: FunEquivalence[];
}

export interface WalkingRecord {
  id: string;
  date: string;
  steps: number;
  pointsEarned: number;
  source: string;
}

export const getWalkingStatus = async (): Promise<{ code: number; data: WalkingStatus; message?: string }> => {
  const res = await apiClient.get('/walking/status');
  return res.data;
};

export const claimWalkingPoints = async (source: string): Promise<{ code: number; data: { pointsEarned: number }; message?: string }> => {
  const res = await apiClient.post('/walking/claim', { source });
  return res.data;
};

export const getWalkingHistory = async (page: number, size: number): Promise<{ code: number; data: { records: WalkingRecord[]; total: number }; message?: string }> => {
  const res = await apiClient.get('/walking/records', { params: { page, size } });
  return res.data;
};
