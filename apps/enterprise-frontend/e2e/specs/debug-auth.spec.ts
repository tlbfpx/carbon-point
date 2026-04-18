import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const CREDS_CACHE_FILE = path.join(process.cwd(), 'e2e', '.test-creds.json');

function getTestCreds(): { phone: string; password: string } {
  try {
    return JSON.parse(fs.readFileSync(CREDS_CACHE_FILE, 'utf-8'));
  } catch {
    throw new Error('Test credentials not found');
  }
}

test('debug auth flow', async ({ page }) => {
  const { phone, password } = getTestCreds();

  // Step 1: Get token from API
  const apiResponse = await page.request.post('http://127.0.0.1:8080/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { phone, password },
  });
  const apiData = await apiResponse.json();
  console.log('Login API response code:', apiData.code);
  console.log('Has data:', !!apiData.data);
  console.log('Has accessToken:', !!(apiData as any).data?.accessToken);

  const { accessToken, refreshToken, user } = (apiData as any).data;
  expect(accessToken).toBeTruthy();

  // Step 2: Navigate to login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  console.log('Navigated to login page');

  // Step 3: Check localStorage before injection
  const lsBefore = await page.evaluate(() => localStorage.getItem('carbon-enterprise-auth'));
  console.log('localStorage before injection:', lsBefore);

  // Step 4: Inject auth
  await page.evaluate(
    ([at, rt, u]) => {
      const key = 'carbon-enterprise-auth';
      const value = JSON.stringify({
        state: { accessToken: at, refreshToken: rt, user: u },
        version: 0,
      });
      localStorage.setItem(key, value);
      console.log('[TEST] localStorage set:', localStorage.getItem(key) ? 'OK' : 'FAILED');
    },
    [accessToken, refreshToken, user]
  );

  // Step 5: Verify localStorage
  const lsAfter = await page.evaluate(() => localStorage.getItem('carbon-enterprise-auth'));
  console.log('localStorage after injection:', lsAfter ? 'SET' : 'NOT SET');
  const parsed = lsAfter ? JSON.parse(lsAfter) : null;
  console.log('Has accessToken in storage:', !!(parsed?.state?.accessToken));

  // Step 6: Navigate to dashboard
  console.log('Navigating to dashboard...');
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('domcontentloaded');
  console.log('Dashboard loaded');

  // Step 7: Check console logs from the browser
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`);
  });

  // Wait a bit for React to mount and hydrate
  await page.waitForTimeout(3000);

  // Step 8: Check what's on the page
  const url = page.url();
  console.log('Current URL:', url);

  const hasSider = await page.evaluate(() => !!document.querySelector('.ant-layout-sider'));
  console.log('Has .ant-layout-sider:', hasSider);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
  console.log('Body text preview:', bodyText);

  // Assert sidebar is visible (the main goal of the fix)
  expect(hasSider).toBe(true);
  // Assert URL is dashboard (not login)
  expect(url).toContain('/dashboard');

  // Take a screenshot for manual inspection
  await page.screenshot({ path: '/tmp/debug-auth.png' });
  console.log('Screenshot saved to /tmp/debug-auth.png');
});
