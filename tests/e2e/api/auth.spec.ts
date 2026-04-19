import { test, expect, request } from '@playwright/test';

// API base URL - matches playwright.config.ts use.baseURL.api
const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8080';

describe('API Authentication', () => {
  test.describe.configure({ mode: 'serial' });

  let accessToken: string;
  let refreshToken: string;

  // -------------------------------------------------------------------------
  // POST /api/auth/login
  // -------------------------------------------------------------------------

  test.describe('POST /api/auth/login', () => {
    test('should return tokens on valid credentials (enterprise admin)', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          phone: '13900000002',
          password: 'Test123456!',
        },
      });

      expect(resp.status()).toBe(200);

      const body = await resp.json();
      // Accept both { code: 200, data: {...} } and { code: '0000', data: {...} }
      expect(['0000', '0', 0, '200', 200]).toContain(body.code);
      expect(body.data).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(typeof body.data.accessToken).toBe('string');
      expect(body.data.accessToken.length).toBeGreaterThan(10);
    });

    test('should return tokens on valid credentials (regular user)', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          phone: '13900000004',
          password: 'Test123456!',
        },
      });

      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(['0000', '0', 0, '200', 200]).toContain(body.code);
      expect(body.data).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
    });

    test('should return 401 on invalid credentials', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          phone: '13900000002',
          password: 'WrongPassword!',
        },
      });

      expect([401, 400]).toContain(resp.status());
      const body = await resp.json();
      expect(body.code).not.toBe(200);
      expect(body.code).not.toBe('0000');
    });

    test('should return 400 when phone is missing', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: { password: 'Test123456!' },
      });

      expect([400, 422]).toContain(resp.status());
    });

    test('should return 400 when password is missing', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: { phone: '13900000002' },
      });

      expect([400, 422]).toContain(resp.status());
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/auth/refresh
  // -------------------------------------------------------------------------

  test.describe('POST /api/auth/refresh', () => {
    test('should return new tokens when refresh token is valid', async () => {
      // First login to get tokens
      const loginResp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '13900000002', password: 'Test123456!' }),
      });

      const loginBody = await loginResp.json();
      if (!loginBody.data?.refreshToken) {
        test.skip();
        return;
      }

      refreshToken = loginBody.data.refreshToken;

      const api = await request.newContext({ baseURL: API_BASE });
      const resp = await api.post('/api/auth/refresh', {
        headers: { 'Content-Type': 'application/json' },
        data: { refreshToken },
      });

      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(['0000', '0', 0, '200', 200]).toContain(body.code);
      expect(body.data).toBeDefined();
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    test('should return 401 when refresh token is invalid or expired', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/refresh', {
        headers: { 'Content-Type': 'application/json' },
        data: { refreshToken: 'invalid-refresh-token-xyz' },
      });

      expect([401, 400]).toContain(resp.status());
    });

    test('should return 400 when refresh token is missing', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.post('/api/auth/refresh', {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      expect([400, 422]).toContain(resp.status());
    });
  });

  // -------------------------------------------------------------------------
  // Token validation & expiry
  // -------------------------------------------------------------------------

  test.describe('Token validation', () => {
    test('should return 401 when using invalid access token', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      const resp = await api.get('/api/users/me', {
        headers: { Authorization: 'Bearer invalid-access-token' },
      });

      // Either 401 (unauthorized) or 403 (forbidden) is acceptable
      expect([401, 403]).toContain(resp.status());
    });

    test('should return 401 when Authorization header is missing on protected route', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      // Try a protected endpoint (user profile)
      const resp = await api.get('/api/users/me');

      expect([401, 403]).toContain(resp.status());
    });

    test('access token should work on a protected endpoint after login', async () => {
      // Login first
      const loginResp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '13900000002', password: 'Test123456!' }),
      });

      const loginBody = await loginResp.json();
      if (!loginBody.data?.accessToken) {
        test.skip();
        return;
      }
      accessToken = loginBody.data.accessToken;

      const api = await request.newContext({ baseURL: API_BASE });
      const resp = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(resp.status()).toBe(200);
      const body = await resp.json();
      expect(['0000', '0', 0, '200', 200]).toContain(body.code);
      expect(body.data).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Token expiry
  // -------------------------------------------------------------------------

  test.describe('Token expiry', () => {
    test('should handle expired access token gracefully', async () => {
      const api = await request.newContext({ baseURL: API_BASE });

      // Use a clearly invalid/expired-format token
      const resp = await api.get('/api/users/me', {
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid' },
      });

      // Should get unauthorized, not crash
      expect([401, 403]).toContain(resp.status());
    });
  });
});
