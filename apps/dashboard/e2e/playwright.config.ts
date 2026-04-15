import { defineConfig, devices, type FullConfig } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

const AUTH_CACHE_FILE = path.join(process.cwd(), 'e2e', '.auth-token.json');

async function globalSetup(_config: FullConfig) {
  try {
    const resp = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138001', password: 'password123' }),
    });
    const data = await resp.json() as { code: number; data?: { accessToken: string; refreshToken: string; user: unknown } };
    if (data.code === 200 && data.data) {
      const authState = {
        state: {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
          isAuthenticated: true,
        },
        version: 0,
      };
      fs.writeFileSync(AUTH_CACHE_FILE, JSON.stringify(authState));
      console.log('[globalSetup] Enterprise auth token cached at:', AUTH_CACHE_FILE);
    } else {
      console.warn('[globalSetup] Enterprise login failed:', data);
    }
  } catch (e) {
    console.warn('[globalSetup] Failed to pre-fetch enterprise auth:', e);
  }
}

function globalTeardown() {
  try { fs.unlinkSync(AUTH_CACHE_FILE); } catch { /* ignore */ }
}

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
    // Allow cross-origin requests in tests (needed because frontend:3001 calls backend:8080)
    launchOptions: {
      args: ['--disable-web-security', '--disable-blink-features=IsolateOrigins,site-per-process'],
    },
  },

  globalSetup,
  globalTeardown,

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
