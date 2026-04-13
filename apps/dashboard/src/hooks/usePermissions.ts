import { useAuthStore } from '@/store/authStore';

export const usePermissions = () => {
  const { hasPermission, hasRole, permissions, user } = useAuthStore();

  return {
    hasPermission,
    hasRole,
    isPlatformAdmin: hasRole('platform_admin'),
    isEnterpriseAdmin: hasRole('enterprise_admin'),
    isSuperAdmin: hasRole('super_admin'),
    permissions,
    roles: user?.roles || [],
  };
};
