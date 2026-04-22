import { apiClient } from './request';

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path: string;
  sortOrder: number;
  disabled: boolean;
  children?: MenuItem[];
}

export const getTenantMenu = async (): Promise<MenuItem[]> => {
  try {
    const res = await apiClient.get('/menus');
    // apiClient interceptor already unwraps the data, so res is the Result object
    const data = (res as any)?.data;
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn('[Menu API] Failed to fetch menu, falling back to static menu', error);
    return [];
  }
};
