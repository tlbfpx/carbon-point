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
  id: string | number;
  date: string;
  steps: number;
  pointsEarned: number;
  source?: string;
}

// 后端返回的原始 FunEquivalence 结构
interface BackendFunEquivalence {
  item: string;
  description: string;
  quantity: number;
}

// 后端返回的原始 WalkingTodayDTO 结构
interface BackendWalkingTodayDTO {
  todaySteps: number;
  stepsThreshold: number;
  claimablePoints: number;
  claimed: boolean;
  funEquivalences: BackendFunEquivalence[];
}

// 图标映射
const ICON_MAP: Record<string, string> = {
  banana: '🍌',
  rice_bowl: '🍚',
  distance_km: '📍',
};

// 映射后端数据到前端格式
const mapFunEquivalence = (backend: BackendFunEquivalence): FunEquivalence => ({
  name: backend.description,
  icon: ICON_MAP[backend.item] || '🏃',
  quantity: backend.quantity,
});

const mapWalkingStatus = (backend: BackendWalkingTodayDTO): WalkingStatus => ({
  todaySteps: backend.todaySteps || 0,
  stepsThreshold: backend.stepsThreshold || 1000,
  claimablePoints: backend.claimablePoints || 0,
  claimed: backend.claimed || false,
  funEquivalences: backend.funEquivalences?.map(mapFunEquivalence) || [],
});

export const getWalkingStatus = async (): Promise<{ code: number; data: WalkingStatus; message?: string }> => {
  const res = await apiClient.get('/walking/today');
  const rawData = res.data.data as BackendWalkingTodayDTO;
  return {
    code: res.data.code,
    data: mapWalkingStatus(rawData),
    message: res.data.message,
  };
};

// 后端返回的原始 WalkingClaimResponseDTO 结构
interface BackendClaimResponse {
  success: boolean;
  message: string;
  steps: number;
  pointsAwarded: number;
  funEquivalences: BackendFunEquivalence[];
  availablePoints: number;
  totalPoints: number;
}

export const claimWalkingPoints = async (source: string): Promise<{ code: number; data: { pointsEarned: number }; message?: string }> => {
  const res = await apiClient.post('/walking/claim', { source });
  const rawData = res.data.data as BackendClaimResponse;
  return {
    code: res.data.code,
    data: {
      pointsEarned: rawData?.pointsAwarded || 0,
    },
    message: rawData?.message || res.data.message,
  };
};

export const getWalkingHistory = async (page: number, size: number): Promise<{ code: number; data: { records: WalkingRecord[]; total: number }; message?: string }> => {
  const res = await apiClient.get('/walking/records', { params: { page, size } });
  return res.data;
};
