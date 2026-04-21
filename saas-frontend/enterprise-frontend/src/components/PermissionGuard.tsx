import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const ROUTE_PERMISSION_MAP: Record<string, string | undefined> = {
  '/dashboard': undefined,
  '/members': 'enterprise:member:list',
  '/rules': 'enterprise:rule:view',
  '/products': 'enterprise:product:list',
  '/orders': 'enterprise:order:list',
  '/points': 'enterprise:point:query',
  '/point-expiration': 'enterprise:point:query',
  '/reports': 'enterprise:report:view',
  '/roles': 'enterprise:role:list',
  '/feature-matrix': 'enterprise:feature:view',
  '/dict-management': 'enterprise:dict:view',
  '/branding': undefined,
  '/operation-log': 'enterprise:log:query',
  '/walking': 'enterprise:walking:view',
  '/walking/step-config': 'enterprise:walking:config',
  '/walking/fun-equiv': 'enterprise:walking:config',
};

interface PermissionGuardProps {
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ children }) => {
  const { permissions, permissionsLoading } = useAuthStore();
  const location = useLocation();

  const currentPath = location.pathname;

  if (permissionsLoading) {
    return <>{children}</>;
  }

  const requiredPerm = ROUTE_PERMISSION_MAP[currentPath];

  if (!requiredPerm || permissions.includes(requiredPerm)) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
};

export default PermissionGuard;
