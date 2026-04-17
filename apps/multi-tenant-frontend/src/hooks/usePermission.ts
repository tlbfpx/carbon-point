import { useAuthStore } from '../store/authStore';

export const usePermission = () => {
  const { hasPermission, hasRole, permissions, user } = useAuthStore();

  return {
    hasPermission: (code: string) => hasPermission(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => hasPermission(c)),
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
