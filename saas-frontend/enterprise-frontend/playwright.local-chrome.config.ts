import { defineConfig, devices } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');

export function readEnterpriseAuth(): string {
  try { return fs.readFileSync(AUTH_CACHE_FILE, 'utf8'); } catch { return ''; }
}

// Find Chrome executable path
function getChromePath(): string {
  const platform = process.platform;
  const possiblePaths: string[] = [];

  if (platform === 'darwin') {
    // macOS
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else if (platform === 'win32') {
    // Windows
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES(x86)}\\Google\\Chrome\\Application\\chrome.exe`
    );
  } else {
    // Linux
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge'
    );
  }

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found Chrome at:', p);
      return p;
    }
  }

  console.warn('Could not find Chrome, using default Playwright path');
  return '';
}

const chromePath = getChromePath();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    launchOptions: {
      executablePath: chromePath || undefined,
      headless: false,
      slowMo: 100, // Slow down for visibility
      args: [
        '--disable-web-security',
        '--disable-blink-features=IsolateOrigins,site-per-process',
        '--start-maximized',
      ],
    },
  },

  projects: [
    {
      name: 'local-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: 'specs/debug-menu.spec.ts',
    },
  ],
});
