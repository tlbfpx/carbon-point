import { apiClient } from './request';

export interface TimeSlotRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
  enabled: boolean;
  sortOrder: number;
  config: string;
}

export interface ConsecutiveReward {
  days: number;
  bonusPoints: number;
}

export interface SpecialDate {
  id: string;
  date: string;
  multiplier: number;
  description?: string;
}

export interface LevelCoefficient {
  level: number;
  coefficient: number;
}

export interface DailyCap {
  maxPoints: number;
}

// Map time slot CRUD to the backend PointRulesController

export const getTimeSlotRules = async (_tenantId: string) => {
  const res = await apiClient.get('/point-rules/enabled');
  // Filter to time_slot type and parse config for display
  const allRules = res.data || [];
  return allRules
    .filter((r: any) => r.type === 'time_slot')
    .map((r: any) => {
      let startTime = '';
      let endTime = '';
      let basePoints = 0;
      try {
        const config = JSON.parse(r.config || '{}');
        startTime = config.startTime || '';
        endTime = config.endTime || '';
        basePoints = config.basePoints || 0;
      } catch {}
      return {
        id: String(r.id),
        name: r.name,
        startTime,
        endTime,
        basePoints,
        enabled: r.enabled,
        sortOrder: r.sortOrder || 0,
        config: r.config,
      };
    });
};

export const createTimeSlotRule = async (data: any) => {
  const config = JSON.stringify({
    startTime: data.startTime,
    endTime: data.endTime,
    minPoints: data.basePoints || 1,
    maxPoints: data.basePoints || 10,
  });
  const res = await apiClient.post('/point-rules', {
    type: 'time_slot',
    name: data.name,
    config,
    enabled: data.enabled !== false,
    sortOrder: data.sortOrder || 0,
  });
  return res.data;
};

export const updateTimeSlotRule = async (id: string, data: Partial<TimeSlotRule>) => {
  const config = JSON.stringify({
    startTime: data.startTime,
    endTime: data.endTime,
    minPoints: data.basePoints || 1,
    maxPoints: data.basePoints || 10,
  });
  const res = await apiClient.put('/point-rules', {
    id: Number(id),
    name: data.name,
    config,
    enabled: data.enabled,
    sortOrder: data.sortOrder,
  });
  return res.data;
};

export const deleteTimeSlotRule = async (id: string) => {
  const res = await apiClient.delete(`/point-rules/${id}`);
  return res.data;
};

// These rule types are stored in point_rules table with their respective types
// Stub implementations until backend endpoints are added

export const getConsecutiveRewards = async (_tenantId: string) => {
  // Not yet implemented in backend - return empty
  return [];
};

export const updateConsecutiveRewards = async (_tenantId: string, _data: ConsecutiveReward[]) => {
  return [];
};

export const getSpecialDates = async (_tenantId: string) => {
  return [];
};

export const createSpecialDate = async (_data: Partial<SpecialDate> & { tenantId: string }) => {
  return null;
};

export const deleteSpecialDate = async (_id: string) => {
  return null;
};

export const getLevelCoefficients = async (_tenantId: string) => {
  return [];
};

export const updateLevelCoefficients = async (_tenantId: string, _data: LevelCoefficient[]) => {
  return [];
};

export const getDailyCap = async (_tenantId: string) => {
  return { maxPoints: 500 };
};

export const updateDailyCap = async (_tenantId: string, _data: DailyCap) => {
  return [];
};
