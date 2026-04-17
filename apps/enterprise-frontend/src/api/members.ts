import { apiClient } from './request';

export interface Member {
  userId: string;
  username: string;
  phone: string;
  totalPoints: number;
  level: number;
  status: 'active' | 'inactive';
  createTime: string;
}

export interface MemberQuery {
  page: number;
  size: number;
  keyword?: string;
}

export const getMembers = async (params: MemberQuery) => {
  const res = await apiClient.get('/users', { params });
  return res.data;
};

export const createMember = async (data: { phone: string; username: string; tenantId?: string }) => {
  const res = await apiClient.post('/users', data);
  return res.data;
};

export const updateMember = async (userId: string, data: Partial<Member>) => {
  const res = await apiClient.put(`/users/${userId}`, data);
  return res.data;
};

export const toggleMemberStatus = async (userId: string, status: 'active' | 'inactive') => {
  const res = await apiClient.put(`/users/${userId}/${status === 'active' ? 'enable' : 'disable'}`);
  return res.data;
};

export const importMembers = async (formData: FormData) => {
  const res = await apiClient.post('/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const generateInviteLink = async (userId: string) => {
  const res = await apiClient.post(`/users/${userId}/invite-link`);
  return res.data;
};
