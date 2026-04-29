/**
 * Playwright 配置 - 本地 Chrome 可视化测试版本
 *
 * 使用方式：
 *   npx playwright test --config=playwright.local-chrome.config.ts --headed
 *
 * 特性：
 *   - 使用本地 Chrome（不是 Playwright 自带的 Chromium）
 *   - 监控 Console Error/Warning
 *   - 开启可视化模式观察执行过程
 *   - 详细的日志输出
 */

import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.platform-auth-token.json');

export function readPlatformAuth(): string {
  try {
    return fs.readFileSync(AUTH_CACHE_FILE, 'utf8');
  } catch {
    return '';
  }
}

// 查找本地 Chrome 路径
function findLocalChrome(): string | undefined {
  const paths = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    // Windows (典型路径)
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
  testDir: './e2e',

  // 本地测试不强制并行，方便观察
  fullyParallel: false,
  forbidOnly: !!process.env.CI,

  // 本地测试不重试，立即看到失败
  retries: 0,

  // 单 worker 顺序执行，容易调试
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'e2e/reports-local', open: 'on-failure' }],
    ['list'],
    ['json', { outputFile: 'e2e/reports-local/results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001/platform',
    trace: 'on', // 始终记录 trace
    screenshot: 'on', // 始终截图
    video: 'on', // 始终录屏
    actionTimeout: 30000, // 更长的超时方便调试
    navigationTimeout: 60000,

    // 使用本地 Chrome
    launchOptions: {
      channel: localChromePath ? undefined : 'chrome', // 使用系统 Chrome Channel
      executablePath: localChromePath,
      headless: false, // 强制 headed 模式
      slowMo: 100, // 稍微放慢操作，方便观察
      args: [
        '--disable-web-security',
        '--disable-blink-features=IsolateOrigins,site-per-process',
        '--auto-open-devtools-for-tabs', // 自动打开 DevTools
        '--start-maximized', // 窗口最大化
      ],
    },
  },

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // 不自动启动 server，假设用户已手动启动
  webServer: undefined,

  projects: [
    {
      name: 'local-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // 大屏幕方便调试
      },
      testMatch: 'specs/**/*.spec.ts',
    },
  ],
});
