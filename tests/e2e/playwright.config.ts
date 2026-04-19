import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: {
      enterprise: 'http://localhost:3000',
      platform: 'http://localhost:3001',
      h5: 'http://localhost:3002/h5',
      api: 'http://localhost:8080',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // H5 User Tests
    {
      name: 'h5',
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:3002/h5',
      },
      testDir: './h5',
    },
    // Enterprise Frontend Tests
    {
      name: 'enterprise',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
      testDir: './enterprise',
    },
    // Platform Frontend Tests
    {
      name: 'platform',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
      testDir: './platform',
    },
    // API Tests
    {
      name: 'api',
      use: {
        baseURL: 'http://localhost:8080',
      },
      testDir: './api',
    },
  ],
});
