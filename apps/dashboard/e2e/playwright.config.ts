import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Carbon Point Dashboard
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Platform admin auth setup
    {
      name: 'setup-platform-admin',
      testMatch: /.*\.setup\.ts/,
      testDir: './e2e',
      // Only match our setup files
      grep: /platform admin login/,
    },

    // Chromium for all tests using platform admin
    {
      name: 'chromium-platform',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/platform-admin.json',
      },
      testMatch: /package-management\.spec\.ts/,
      dependencies: [],
    },

    // Enterprise admin auth setup
    {
      name: 'setup-enterprise-admin',
      testMatch: /.*\.setup\.ts/,
      testDir: './e2e',
      grep: /enterprise super admin login/,
    },

    // Enterprise operator auth setup
    {
      name: 'setup-enterprise-operator',
      testMatch: /.*\.setup\.ts/,
      testDir: './e2e',
      grep: /enterprise operator login/,
    },

    // Chromium for role management tests (enterprise admin)
    {
      name: 'chromium-enterprise',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/enterprise-admin.json',
      },
      testMatch: /role-management\.spec\.ts/,
      dependencies: [],
    },

    // Chromium for permission filtering tests (enterprise operator)
    {
      name: 'chromium-operator',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/enterprise-operator.json',
      },
      testMatch: /permission-filtering\.spec\.ts/,
      dependencies: [],
    },

    // Mobile Safari (simulated) for permission filtering
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
        storageState: 'e2e/.auth/enterprise-operator.json',
      },
      testMatch: /permission-filtering\.spec\.ts/,
    },
  ],

  // Start dev server if not in CI
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
