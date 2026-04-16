import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAuthStore.getState().logout();
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login sets accessToken, refreshToken, user and isAuthenticated', () => {
    const store = useAuthStore.getState();
    const mockUser = {
      userId: 'user-1',
      username: '测试用户',
      tenantId: 'tenant-1',
    };

    store.login('access-token-123', 'refresh-token-456', mockUser);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-token-123');
    expect(state.refreshToken).toBe('refresh-token-456');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout clears all auth state', () => {
    const store = useAuthStore.getState();
    store.login('token', 'refresh', { userId: 'u1', username: 'test', tenantId: 't1' });
    store.logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updateUser partially updates user data', () => {
    const store = useAuthStore.getState();
    store.login('token', 'refresh', { userId: 'u1', username: 'test', tenantId: 't1' });

    store.updateUser({ phone: '13800138000', email: 'test@example.com' });

    const state = useAuthStore.getState();
    expect(state.user?.userId).toBe('u1');
    expect(state.user?.username).toBe('test');
    expect(state.user?.phone).toBe('13800138000');
    expect(state.user?.email).toBe('test@example.com');
  });

  it('updateUser does nothing when user is null', () => {
    const store = useAuthStore.getState();
    expect(() => store.updateUser({ phone: '13800138000' })).not.toThrow();
  });
});
