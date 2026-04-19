import { apiClient } from './request';

export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface OperationLogQuery {
  page?: number;
  size?: number;
  username?: string;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

export interface OperationLogListResponse {
  code: number;
  data: {
    records: OperationLog[];
    total: number;
    page: number;
    size: number;
  };
}

export const getOperationLogs = async (params: OperationLogQuery): Promise<OperationLogListResponse> => {
  const res = await apiClient.get('/system/log/list', { params });
  return res.data;
};

export const getOperationLogDetail = async (id: string): Promise<OperationLog> => {
  const res = await apiClient.get(`/system/log/${id}`);
  return res.data;
};
