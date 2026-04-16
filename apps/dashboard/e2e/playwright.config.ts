import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');

export function readEnterpriseAuth(): string {
  try { return fs.readFileSync(AUTH_CACHE_FILE, 'utf8'); } catch { return ''; }
}

export default defineConfig({
  testDir: '.',
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
    // Allow cross-origin requests in tests (needed because frontend:3001 calls backend:8080)
    launchOptions: {
      args: ['--disable-web-security', '--disable-blink-features=IsolateOrigins,site-per-process'],
    },
  },

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @carbon-point/dashboard dev',
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
      testMatch: 'specs/**/*.spec.ts',
    },
  ],
});
