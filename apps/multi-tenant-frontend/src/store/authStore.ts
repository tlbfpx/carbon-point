// Stub authStore — will be replaced by full implementation in Task #4
// This stub exists only to satisfy TypeScript import resolution during Task #3
import { create } from 'zustand';

export interface AdminUser {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  permissions: string[];
  permissionsLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: AdminUser, permissions?: string[]) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
  fetchPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(() => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  permissions: [],
  permissionsLoading: false,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  fetchPermissions: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
  hydrate: () => {},
}));
