import { defineConfig, devices } from '@playwright/test';
import os from 'os';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : Math.min(8, os.cpus().length),
  reporter: [
    ['html', { outputFolder: 'reports', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'reports/results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_H5_BASE_URL || 'http://localhost:3000/h5',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 45000,
    viewport: { width: 375, height: 812 },
  },

  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd /Users/muxi/workspace/carbon-point && pnpm --filter @carbon-point/h5 dev',
        url: 'http://localhost:3000/h5/',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
      },
      testMatch: 'specs/h5/**/*.spec.ts',
    },
  ],
});
