import { apiClient } from './request';

export interface CheckInParams {
  ruleId: number;
}

export interface CheckInStatusResponse {
  /** 是否已打卡（对应后端 success 字段） */
  checkedIn: boolean;
  pointsEarned: number;
  consecutiveDays: number;
  availablePoints?: number;
  totalPoints?: number;
  level?: number;
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

export interface TimeSlotResponse {
  ruleId: number;
  name: string;
  startTime: string;
  endTime: string;
  status: 'checked_in' | 'available' | 'not_started' | 'ended';
  recordId?: number;
}

export interface GetTodayCheckInRawResponse {
  success: boolean;
  message?: string;
  recordId?: number;
  basePoints?: number;
  finalPoints?: number;
  multiplier?: number;
  levelCoefficient?: number;
  streakBonus?: number;
  totalPoints?: number;
  consecutiveDays?: number;
  availablePoints?: number;
  totalPoints_?: number;
  level?: number;
  checkinTime?: string;
}

export const getTodayCheckInStatus = async (): Promise<ApiResponse<CheckInStatusResponse>> => {
  const res = await apiClient.get('/checkin/today');
  const raw: ApiResponse<GetTodayCheckInRawResponse> = res.data;
  // Map backend field names to frontend expected names
  return {
    code: raw.code,
    message: raw.message,
    data: {
      checkedIn: raw.data?.success ?? false,
      pointsEarned: raw.data?.finalPoints ?? 0,
      consecutiveDays: raw.data?.consecutiveDays ?? 0,
      availablePoints: raw.data?.availablePoints,
      totalPoints: raw.data?.totalPoints ?? raw.data?.totalPoints_ ?? 0,
      level: raw.data?.level,
    },
  };
};

export const doCheckIn = async (params: CheckInParams): Promise<ApiResponse<{ pointsEarned: number }>> => {
  const res = await apiClient.post('/checkin', params);
  // 修复: 映射 totalPoints -> pointsEarned
  return {
    code: res.data.code,
    data: {
      pointsEarned: res.data.data?.totalPoints ?? 0,
    },
    message: res.data.message,
  };
};

export const getTimeSlots = async (): Promise<ApiResponse<TimeSlotResponse[]>> => {
  const res = await apiClient.get('/checkin/time-slots');
  return res.data;
};

export const getCheckInHistory = async (params: { page: number; size: number }) => {
  const res = await apiClient.get('/checkin/history', { params });
  return res.data;
};
