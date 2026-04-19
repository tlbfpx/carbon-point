import { apiClient } from './request';

export interface DictItem {
  id: string;
  name: string;
  code: string;
  type: 'system' | 'business' | 'status';
  description?: string;
  enabled: boolean;
}

interface GetDictItemsParams {
  page: number;
  size: number;
  keyword?: string;
  type?: string;
}

interface DictItemResponse {
  data: {
    records: DictItem[];
    total: number;
    page: number;
    size: number;
  };
  code: number;
}

export const getDictItems = async (params: GetDictItemsParams) => {
  const res = await apiClient.get<DictItemResponse>('/dict/items', { params });
  return res.data;
};

export const createDictItem = async (data: Partial<DictItem>) => {
  const res = await apiClient.post('/dict/items', data);
  return res.data;
};

export const updateDictItem = async (id: string, data: Partial<DictItem>) => {
  const res = await apiClient.put(`/dict/items/${id}`, data);
  return res.data;
};

export const deleteDictItem = async (id: string) => {
  const res = await apiClient.delete(`/dict/items/${id}`);
  return res.data;
};
