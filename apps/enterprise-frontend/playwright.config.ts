import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');

export function readEnterpriseAuth(): string {
  try { return fs.readFileSync(AUTH_CACHE_FILE, 'utf8'); } catch { return ''; }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : Math.min(8, os.cpus().length),
  reporter: [
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'e2e/reports/results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 45000,
    launchOptions: {
      args: ['--disable-web-security', '--disable-blink-features=IsolateOrigins,site-per-process'],
    },
  },

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @carbon-point/enterprise-frontend dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: 'e2e/specs/**/*.spec.ts',
    },
  ],
});
