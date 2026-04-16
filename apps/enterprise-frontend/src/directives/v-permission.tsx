import { useAuthStore } from '../store/authStore';

/**
 * Permission utility function to check if current user has required permissions.
 *
 * @param permissions - Single permission code or array of codes
 * @returns true if has permission, false otherwise
 */
export const hasPermission = (permissions: string | string[]): boolean => {
  const authStore = useAuthStore.getState();
  const userPermissions = authStore.permissions || [];

  if (!permissions) return true;
  if (userPermissions.includes('*')) return true; // super admin has all permissions

  const required = Array.isArray(permissions) ? permissions : [permissions];
  return required.every(p => userPermissions.includes(p));
};

/**
 * React component variant: Hides children if permission check fails.
 * Usage:
 * <RequirePermission permission="user:add">
 *   <Button>Add User</Button>
 * </RequirePermission>
 *
 * <RequirePermission permissions={['user:add', 'user:edit']}>
 *   <Button>Edit User</Button>
 * </RequirePermission>
 */
interface RequirePermissionProps {
  permission?: string;
  permissions?: string[];
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  permissions,
  children,
}) => {
  const required = permissions || (permission ? [permission] : []);
  if (!hasPermission(required)) {
    return null;
  }
  return <>{children}</>;
};

