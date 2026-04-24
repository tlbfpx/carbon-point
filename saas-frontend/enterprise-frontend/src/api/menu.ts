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

/**
 * Fetches the tenant's dynamic menu configuration from the backend.
 *
 * Current backend returns: GET /menus → Result<List<MenuItemVO>>
 * Planned migration (enterprise-package-menu-design.md §3):
 *   GET /enterprise/package/menus → PackageMenusResponse { packageId, packageName, menus: MenuItem[] }
 * When the backend migrates, add an adapter here to unwrap .menus from the new envelope.
 */
export const getTenantMenu = async (): Promise<MenuItem[]> => {
  try {
    const res = await apiClient.get('/menus');
    const data = (res as any)?.data;

    // Adapter: handle both current array format and planned PackageMenusResponse envelope
    if (data && !Array.isArray(data) && Array.isArray(data.menus)) {
      return data.menus;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn('[Menu API] Failed to fetch menu, falling back to static menu', error);
    return [];
  }
};
