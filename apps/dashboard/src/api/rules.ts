import { apiClient } from './request';

export interface TimeSlotRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
  enabled: boolean;
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

export const getTimeSlotRules = async (tenantId: string) => {
  const res = await apiClient.get('/points/rules/timeslots', { params: { tenantId } });
  return res.data;
};

export const createTimeSlotRule = async (data: Partial<TimeSlotRule> & { tenantId: string }) => {
  const res = await apiClient.post('/points/rules/timeslots', data);
  return res.data;
};

export const updateTimeSlotRule = async (id: string, data: Partial<TimeSlotRule>) => {
  const res = await apiClient.put(`/points/rules/timeslots/${id}`, data);
  return res.data;
};

export const deleteTimeSlotRule = async (id: string) => {
  const res = await apiClient.delete(`/points/rules/timeslots/${id}`);
  return res.data;
};

export const getConsecutiveRewards = async (tenantId: string) => {
  const res = await apiClient.get('/points/rules/consecutive', { params: { tenantId } });
  return res.data;
};

export const updateConsecutiveRewards = async (tenantId: string, data: ConsecutiveReward[]) => {
  const res = await apiClient.put('/points/rules/consecutive', { tenantId, rewards: data });
  return res.data;
};

export const getSpecialDates = async (tenantId: string) => {
  const res = await apiClient.get('/points/rules/special-dates', { params: { tenantId } });
  return res.data;
};

export const createSpecialDate = async (data: Partial<SpecialDate> & { tenantId: string }) => {
  const res = await apiClient.post('/points/rules/special-dates', data);
  return res.data;
};

export const deleteSpecialDate = async (id: string) => {
  const res = await apiClient.delete(`/points/rules/special-dates/${id}`);
  return res.data;
};

export const getLevelCoefficients = async (tenantId: string) => {
  const res = await apiClient.get('/points/rules/level-coefficients', { params: { tenantId } });
  return res.data;
};

export const updateLevelCoefficients = async (tenantId: string, data: LevelCoefficient[]) => {
  const res = await apiClient.put('/points/rules/level-coefficients', { tenantId, coefficients: data });
  return res.data;
};

export const getDailyCap = async (tenantId: string) => {
  const res = await apiClient.get('/points/rules/daily-cap', { params: { tenantId } });
  return res.data;
};

export const updateDailyCap = async (tenantId: string, data: DailyCap) => {
  const res = await apiClient.put('/points/rules/daily-cap', { tenantId, ...data });
  return res.data;
};
