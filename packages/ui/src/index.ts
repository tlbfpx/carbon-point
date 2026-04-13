// Shared UI components for Carbon Point
// Note: Ant Design is the primary UI library, this package exports wrappers and extensions

export {};

// Component naming conventions:
// - Page-level components live in apps
// - Shared/formatter components can be added here

// Example shared types that both dashboard and h5 use:
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

export interface TableColumn<T = any> {
  title: string;
  dataIndex: keyof T | string;
  key: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface StatusBadge {
  status: string;
  label: string;
  color: string;
}

export const DEFAULT_LEVEL_CONFIG = [
  { level: 1, name: '青铜', min: 0, max: 999, color: '#cd7f32' },
  { level: 2, name: '白银', min: 1000, max: 4999, color: '#c0c0c0' },
  { level: 3, name: '黄金', min: 5000, max: 19999, color: '#ffd700' },
  { level: 4, name: '铂金', min: 20000, max: 49999, color: '#e5e4e2' },
  { level: 5, name: '钻石', min: 50000, max: Infinity, color: '#b9f2ff' },
] as const;

export const getLevelByPoints = (totalPoints: number) => {
  return DEFAULT_LEVEL_CONFIG.find((l) => totalPoints >= l.min && totalPoints <= l.max) || DEFAULT_LEVEL_CONFIG[0];
};

export const ORDER_STATUS_CONFIG: Record<string, StatusBadge> = {
  pending: { status: 'pending', label: '待处理', color: 'orange' },
  fulfilled: { status: 'fulfilled', label: '已发放', color: 'green' },
  used: { status: 'used', label: '已使用', color: 'blue' },
  expired: { status: 'expired', label: '已过期', color: 'default' },
  cancelled: { status: 'cancelled', label: '已取消', color: 'red' },
};

export const USER_STATUS_CONFIG: Record<string, StatusBadge> = {
  active: { status: 'active', label: '活跃', color: 'green' },
  inactive: { status: 'inactive', label: '停用', color: 'default' },
};

export const TENANT_STATUS_CONFIG: Record<string, StatusBadge> = {
  active: { status: 'active', label: '正式', color: 'green' },
  trial: { status: 'trial', label: '试用', color: 'orange' },
  expired: { status: 'expired', label: '过期', color: 'default' },
  suspended: { status: 'suspended', label: '停用', color: 'red' },
};

export const PRODUCT_TYPE_CONFIG: Record<string, StatusBadge> = {
  coupon: { status: 'coupon', label: '优惠券', color: 'blue' },
  recharge: { status: 'recharge', label: '直充', color: 'green' },
  privilege: { status: 'privilege', label: '权益', color: 'purple' },
};
