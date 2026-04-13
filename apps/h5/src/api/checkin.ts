import { apiClient } from './request';

export interface CheckInParams {
  tenantId: string;
}

export interface CheckInStatusResponse {
  checkedIn: boolean;
  checkInTime?: string;
  pointsEarned: number;
  timeSlotRule?: string;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  tenantId: string;
  checkInTime: string;
  timeSlotRuleId: string;
  pointsEarned: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
}

export const getTodayCheckInStatus = async (): Promise<ApiResponse<CheckInStatusResponse>> => {
  const res = await apiClient.get('/checkin/today');
  return res.data;
};

export const doCheckIn = async (params: CheckInParams): Promise<ApiResponse<{ pointsEarned: number }>> => {
  const res = await apiClient.post('/checkin', params);
  return res.data;
};

export const getCheckInHistory = async (params: { tenantId: string; page: number; size: number }) => {
  const res = await apiClient.get('/checkin/history', { params });
  return res.data;
};
