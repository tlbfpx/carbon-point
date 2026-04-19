import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export const usePermission = () => {
  const { hasPermission: storeHasPermission, hasRole, permissions, user } = useAuthStore();

  const hasPermission = useCallback(
    (code: string) => storeHasPermission(code),
    [storeHasPermission]
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((c) => storeHasPermission(c)),
    [storeHasPermission]
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    isPlatformAdmin: hasRole('platform_admin'),
    isEnterpriseAdmin: hasRole('enterprise_admin'),
    isSuperAdmin: hasRole('super_admin'),
    permissions,
    roles: user?.roles || [],
  };
};

// Backward-compatible alias
export const usePermissions = usePermission;
