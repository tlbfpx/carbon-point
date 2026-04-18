import { create } from 'zustand';
import { getMyPermissions } from '@/api/auth';

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
  fetchPermissionsPromise: Promise<void> | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: AdminUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AdminUser>) => void;
  fetchPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hydrate: () => void;
}

const STORAGE_KEY = 'carbon-enterprise-auth';

function loadFromStorage(): Partial<{ accessToken: string | null; refreshToken: string | null; user: AdminUser | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (state && (state.accessToken || state.refreshToken || state.user)) {
      return {
        accessToken: state.accessToken ?? null,
        refreshToken: state.refreshToken ?? null,
        user: state.user ?? null,
      };
    }
  } catch {}
  return {};
}

function saveToStorage(state: { accessToken: string | null; refreshToken: string | null; user: AdminUser | null }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }));
  } catch {}
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  permissions: [],
  permissionsLoading: false,
  fetchPermissionsPromise: null,
  isAuthenticated: false,

  hydrate: () => {
    const stored = loadFromStorage();
    console.log('[authStore] hydrate() called, stored.hasToken:', !!(stored.accessToken || stored.refreshToken || stored.user));
    if (stored.accessToken || stored.refreshToken || stored.user) {
      console.log('[authStore] Setting isAuthenticated=true');
      set({ ...stored, isAuthenticated: true });
      get().fetchPermissions();
    }
  },

  login: (accessToken, refreshToken, user) => {
    console.log('[authStore] login() called');
    const state = { accessToken, refreshToken, user, isAuthenticated: true as const };
    set(state);
    saveToStorage(state);
    get().fetchPermissions();
  },

  logout: () => {
    console.log('[authStore] logout() called, clearing auth state');
    const state = { accessToken: null, refreshToken: null, user: null, permissions: [], isAuthenticated: false as const };
    set(state);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },

  updateUser: (partial) => {
    const current = get();
    if (!current.user) return;
    const updated = { ...current, user: { ...current.user, ...partial } };
    set({ user: updated.user });
    saveToStorage({ accessToken: updated.accessToken, refreshToken: updated.refreshToken, user: updated.user });
  },

  fetchPermissions: async () => {
    const existing = get().fetchPermissionsPromise;
    if (existing) return existing;

    const promise = (async () => {
      set({ permissionsLoading: true });
      try {
        const perms = await getMyPermissions();
        set({ permissions: perms, permissionsLoading: false, fetchPermissionsPromise: null });
      } catch {
        set({ permissionsLoading: false, fetchPermissionsPromise: null });
      }
    })();

    set({ fetchPermissionsPromise: promise });
    return promise;
  },

  hasPermission: (permission: string) => {
    const { permissions } = get();
    if (permissions?.includes('*')) return true;
    return permissions?.includes(permission) ?? false;
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    return user.roles?.includes(role) ?? false;
  },
}));
