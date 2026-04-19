import { apiClient } from './request';

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  tenantId?: string;
  permissions: string[];
  role_type: 'super_admin' | 'operator' | 'custom';
  is_editable: boolean;
  createTime: string;
}

export interface Permission {
  key: string;
  label: string;
  children?: Permission[];
}

export const getRoles = async () => {
  const res = await apiClient.get('/roles');
  return res.data;
};

export const createRole = async (data: { name: string; description?: string; permissions: string[] }) => {
  const res = await apiClient.post('/roles', data);
  return res.data;
};

export const updateRole = async (id: string, data: { name?: string; description?: string }) => {
  const res = await apiClient.put(`/roles/${id}`, data);
  return res.data;
};

export const deleteRole = async (id: string) => {
  const res = await apiClient.delete(`/roles/${id}`);
  return res.data;
};

export const getRolePermissions = async (id: string) => {
  const res = await apiClient.get(`/roles/${id}/permissions`);
  return res.data;
};

export const updateRolePermissions = async (id: string, permissions: string[]) => {
  const res = await apiClient.put(`/roles/${id}/permissions`, { permissions });
  return res.data;
};

export const getAvailablePermissions = async () => {
  const res = await apiClient.get('/roles/available');
  return res.data;
};

export const getPermissions = async () => {
  const res = await apiClient.get('/system/permissions');
  return res.data;
};
