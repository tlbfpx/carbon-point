import { create } from 'zustand';
import { getMyPermissions, getPlatformMyPermissions } from '@/shared/api/auth';

export interface AdminUser {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  avatar?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin?: boolean;
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

const STORAGE_KEY = 'carbon-dashboard-auth';

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
    if (stored.accessToken || stored.refreshToken || stored.user) {
      set({ ...stored, isAuthenticated: true });
      // Fetch permissions after hydration if user is already logged in
      get().fetchPermissions();
    }
  },

  login: (accessToken, refreshToken, user) => {
    const state = { accessToken, refreshToken, user, isAuthenticated: true as const };
    set(state);
    saveToStorage(state);
    // Fetch permissions after login
    get().fetchPermissions();
  },

  logout: () => {
    const state = { accessToken: null, refreshToken: null, user: null, isAuthenticated: false as const };
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
    // Dedup: if a fetch is already in progress, return the same promise
    const existing = get().fetchPermissionsPromise;
    if (existing) return existing;

    const promise = (async () => {
      set({ permissionsLoading: true });
      try {
        const isPlatform = get().user?.isPlatformAdmin;
        const perms = isPlatform
          ? await getPlatformMyPermissions()
          : await getMyPermissions();
        set({ permissions: perms, permissionsLoading: false, fetchPermissionsPromise: null });
      } catch {
        set({ permissionsLoading: false, fetchPermissionsPromise: null });
        // Silently fail - permissions may be loaded from user object on login
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
