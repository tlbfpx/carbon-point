import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
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
    {
      name: 'setup-platform-admin',
      testMatch: /.*\.setup\.ts/,
      grep: /platform admin login/,
    },
    {
      name: 'setup-enterprise-admin',
      testMatch: /.*\.setup\.ts/,
      grep: /enterprise super admin login/,
    },
    {
      name: 'setup-enterprise-operator',
      testMatch: /.*\.setup\.ts/,
      grep: /enterprise operator login/,
    },

    {
      name: 'chromium-enterprise',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/enterprise-admin.json',
      },
      testMatch: /e2e\/specs\/enterprise\/.*\.spec\.ts/,
      dependencies: ['setup-enterprise-admin'],
    },

    {
      name: 'chromium-platform',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/platform-admin.json',
      },
      testMatch: /e2e\/specs\/platform\/.*\.spec\.ts/,
      dependencies: ['setup-platform-admin'],
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @carbon-point/dashboard dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
