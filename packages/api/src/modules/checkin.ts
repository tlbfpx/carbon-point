import { request, PageResult } from '../request';

export interface CheckInStatus {
  checkedIn: boolean;
  checkInTime?: string;
  pointsEarned: number;
  timeSlotRuleId?: string;
  timeSlotRuleName?: string;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  tenantId: string;
  checkInTime: string;
  timeSlotRuleId: string;
  timeSlotRuleName: string;
  pointsEarned: number;
  consecutiveDays: number;
}

export interface DoCheckInParams {
  tenantId: string;
  userId?: string;
}

export interface CheckInQueryParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface TimeSlotRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
  multiplier: number;
  enabled: boolean;
}

export const checkinApi = {
  getTodayStatus: (userId: string) =>
    request.get<CheckInStatus>(`/checkin/today`, { params: { userId } }),

  doCheckIn: (params: DoCheckInParams) =>
    request.post<{ pointsEarned: number; checkInRecord: CheckInRecord }>('/checkin/do', params),

  getHistory: (tenantId: string, params?: CheckInQueryParams) =>
    request.get<PageResult<CheckInRecord>>('/checkin/history', { params: { tenantId, ...params } }),

  getTimeSlotRules: (tenantId: string) =>
    request.get<TimeSlotRule[]>(`/tenants/${tenantId}/checkin-rules`),

  createTimeSlotRule: (tenantId: string, rule: Omit<TimeSlotRule, 'id'>) =>
    request.post<TimeSlotRule>(`/tenants/${tenantId}/checkin-rules`, rule),

  updateTimeSlotRule: (tenantId: string, ruleId: string, rule: Partial<TimeSlotRule>) =>
    request.put<TimeSlotRule>(`/tenants/${tenantId}/checkin-rules/${ruleId}`, rule),

  deleteTimeSlotRule: (tenantId: string, ruleId: string) =>
    request.delete<void>(`/tenants/${tenantId}/checkin-rules/${ruleId}`),
};
