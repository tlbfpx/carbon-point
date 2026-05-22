/**
 * Resource type constants and utilities.
 */

export const RESOURCE_TYPES = {
  FUNCTION_PRODUCT: 'FUNCTION_PRODUCT',
  MALL_PRODUCT: 'MALL_PRODUCT',
  FEATURE: 'FEATURE',
  PERMISSION_GROUP: 'PERMISSION_GROUP',
} as const;

export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  [RESOURCE_TYPES.FUNCTION_PRODUCT]: 'blue',
  [RESOURCE_TYPES.MALL_PRODUCT]: 'green',
  [RESOURCE_TYPES.FEATURE]: 'orange',
  [RESOURCE_TYPES.PERMISSION_GROUP]: 'purple',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  [RESOURCE_TYPES.FUNCTION_PRODUCT]: '功能产品',
  [RESOURCE_TYPES.MALL_PRODUCT]: '商城商品',
  [RESOURCE_TYPES.FEATURE]: '功能点',
  [RESOURCE_TYPES.PERMISSION_GROUP]: '权限组',
};

export function getResourceTypeColor(type: string): string {
  return RESOURCE_TYPE_COLORS[type as ResourceType] || 'default';
}

export function getResourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type as ResourceType] || type;
}

/**
 * Package status constants.
 */
export const PACKAGE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DEPRECATED: 'DEPRECATED',
} as const;

export type PackageStatus = typeof PACKAGE_STATUS[keyof typeof PACKAGE_STATUS];

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  [PACKAGE_STATUS.ACTIVE]: '启用',
  [PACKAGE_STATUS.INACTIVE]: '停用',
  [PACKAGE_STATUS.DEPRECATED]: '废弃',
};

export const PACKAGE_STATUS_COLORS: Record<PackageStatus, string> = {
  [PACKAGE_STATUS.ACTIVE]: 'green',
  [PACKAGE_STATUS.INACTIVE]: 'orange',
  [PACKAGE_STATUS.DEPRECATED]: 'default',
};
