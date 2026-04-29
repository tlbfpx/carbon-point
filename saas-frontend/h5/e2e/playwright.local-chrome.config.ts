/**
 * Playwright 配置 - 本地 Chrome 可视化测试版本（H5）
 *
 * 使用方式：
 *   npx playwright test --config=e2e/playwright.local-chrome.config.ts --headed
 */

import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import fs from 'fs';

// 查找本地 Chrome 路径
function findLocalChrome(): string | undefined {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log('[Local Chrome] Found at:', p);
      return p;
    }
  }
  console.log('[Local Chrome] Not found, using bundled Chromium');
  return undefined;
}

const localChromePath = findLocalChrome();

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'reports-local', open: 'on-failure' }],
    ['list'],
    ['json', { outputFile: 'reports-local/results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_H5_BASE_URL || 'http://localhost:3000/h5',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    viewport: { width: 375, height: 812 },

    launchOptions: {
      channel: localChromePath ? undefined : 'chrome',
      executablePath: localChromePath,
      headless: false,
      slowMo: 100,
      args: [
        '--disable-web-security',
        '--disable-blink-features=IsolateOrigins,site-per-process',
        '--auto-open-devtools-for-tabs',
      ],
    },
  },

  webServer: undefined,

  projects: [
    {
      name: 'local-chrome-h5',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
      },
      testMatch: 'specs/h5/**/*.spec.ts',
    },
  ],
});
