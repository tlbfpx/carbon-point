import { useAuthStore } from '@/store/authStore';

export const usePermission = () => {
  const { permissions } = useAuthStore();
  return {
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some(c => permissions.includes(c)),
  };
};
