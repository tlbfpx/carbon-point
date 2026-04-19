import { apiClient } from './request';

export interface PointsAccount {
  userId: string;
  username: string;
  phone: string;
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  level: number;
}

export interface PointsFlow {
  id: string;
  userId: string;
  points: number;
  type: 'checkin' | 'exchange' | 'adjust' | 'consecutive_bonus' | 'special_date_bonus';
  description: string;
  createTime: string;
  operatorId?: string;
  operatorName?: string;
}

export interface PointsQuery {
  page: number;
  size: number;
  tenantId?: string;
  userId?: string;
  phone?: string;
  type?: string;
}

export const queryPointsAccount = async (phone: string, tenantId?: string) => {
  const res = await apiClient.get('/points/account/query', { params: { phone, tenantId } });
  return res.data;
};

export const getPointsFlow = async (params: PointsQuery) => {
  const res = await apiClient.get('/points/flow', { params });
  return res.data;
};

export const grantPoints = async (data: {
  userId: string;
  tenantId: string;
  points: number;
  description: string;
  operatorId?: string;
}) => {
  const payload = { ...data };
  if (!payload.operatorId) {
    delete payload.operatorId;
  }
  const res = await apiClient.post('/points/grant', payload);
  return res.data;
};

export const deductPoints = async (data: {
  userId: string;
  tenantId: string;
  points: number;
  description: string;
  operatorId?: string;
}) => {
  const payload = { ...data };
  if (!payload.operatorId) {
    delete payload.operatorId;
  }
  const res = await apiClient.post('/points/deduct', payload);
  return res.data;
};

export const getPointsStats = async (tenantId: string) => {
  const res = await apiClient.get('/points/stats', { params: { tenantId } });
  return res.data;
};
