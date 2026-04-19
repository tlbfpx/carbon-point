import { request } from '@playwright/test';

/**
 * Test data and API helpers shared across all E2E tests.
 * Provides authenticated state management and test fixtures.
 */

export interface TestCredentials {
  phone: string;
  password: string;
  tenantId?: string;
  userId?: string;
}

/**
 * Default test credentials for enterprise admin.
 * In production, these should come from environment variables or a secrets manager.
 */
export const DEFAULT_ENTERPRISE_CREDENTIALS: TestCredentials = {
  phone: process.env.E2E_ENTERPRISE_PHONE || '13800138000',
  password: process.env.E2E_ENTERPRISE_PASSWORD || 'Test@123456',
};

/**
 * API-based login helper that performs login and returns auth tokens.
 * Used to pre-authenticate for tests that need authenticated state.
 * Endpoint: POST /api/auth/login
 */
export async function performApiLogin(
  credentials: TestCredentials,
  apiBaseUrl: string = 'http://localhost:8080'
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const response = await request.post(`${apiBaseUrl}/api/auth/login`, {
    data: {
      phone: credentials.phone,
      password: credentials.password,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`API login failed: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  const data = body.data || body;

  return {
    accessToken: data.accessToken || data.token,
    refreshToken: data.refreshToken || data.refresh_token,
    user: data.user || data,
  };
}

/**
 * Sets authentication state in browser storage via API login.
 * Uses the same storage key as enterprise-frontend: 'carbon-enterprise-auth'
 * Call this in test hooks (beforeAll/beforeEach) to authenticate.
 */
export async function setBrowserAuth(page: any, credentials?: TestCredentials): Promise<void> {
  const creds = credentials || DEFAULT_ENTERPRISE_CREDENTIALS;

  // Perform API login
  const { accessToken, refreshToken, user } = await performApiLogin(creds);

  // Set auth state in localStorage - matches authStore.ts storage key
  await page.evaluate(
    ([at, rt, u]: [string, string, any]) => {
      localStorage.setItem(
        'carbon-enterprise-auth',
        JSON.stringify({
          state: {
            accessToken: at,
            refreshToken: rt,
            user: u,
            isAuthenticated: true,
          },
          version: 0,
        })
      );
    },
    [accessToken, refreshToken, user]
  );
}

/**
 * Clears authentication state from browser storage.
 */
export async function clearBrowserAuth(page: any): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('carbon-enterprise-auth');
    sessionStorage.clear();
  });
}

/**
 * Test user fixtures for member management tests.
 */
export const TEST_MEMBER_FIXTURES = {
  validMember: {
    phone: '13900139001',
    username: '测试成员',
  },
  invalidPhone: {
    phone: '12345',
    username: '测试',
  },
  duplicatePhone: {
    phone: '13800138000', // Same as admin
    username: '重复成员',
  },
};

/**
 * Test role fixtures for roles management tests.
 */
export const TEST_ROLE_FIXTURES = {
  customRole: {
    name: '测试角色',
    description: '自动化测试创建的自定义角色',
    permissions: [],
  },
  duplicateRole: {
    name: '管理员',
    description: '重复角色名测试',
    permissions: [],
  },
};
