import { type Page } from '@playwright/test';
import { BASE_URL, API_BASE, TEST_USERS } from './config';

/**
 * Login via API and inject auth token via storageState.
 * Returns the auth data for use in authenticated tests.
 */
export async function loginAsH5User(
  page: Page,
  phone: string = TEST_USERS.enterpriseAdmin.phone,
  password: string = TEST_USERS.enterpriseAdmin.password
): Promise<{ accessToken: string; refreshToken: string; user: unknown } | null> {
  const apiResponse = await page.request.post(`${API_BASE}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { phone, password },
  });
  const apiData = await apiResponse.json();

  // API returns { code: "0000", data: { accessToken, refreshToken, user, ... } }
  if ((apiData.code === 200 || apiData.code === '0000' || apiData.code === 0) && apiData.data) {
    const { accessToken, refreshToken, user } = apiData.data;

    // Navigate to login page first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Inject auth via addInitScript - runs before page JS
    await page.context().addInitScript(async ({ token, refreshToken: rt, user: u }) => {
      localStorage.setItem(
        'carbon-auth',
        JSON.stringify({
          state: {
            accessToken: token,
            refreshToken: rt,
            user: u,
            isAuthenticated: true,
          },
          version: 0,
        })
      );
    }, { token: accessToken, refreshToken, user });

    // Reload to apply the init script
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    return { accessToken, refreshToken, user };
  }

  console.warn('[loginAsH5User] Login failed, code:', apiData.code);
  return null;
}

/**
 * Login and navigate to a protected H5 page.
 */
export async function loginAndNavigate(page: Page, path: string = '/') {
  await loginAsH5User(page);
  await page.goto(`${BASE_URL}${path}`);
  await waitForPageReady(page);
}

/**
 * Clear H5 auth from localStorage.
 */
export async function clearH5Auth(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() => localStorage.removeItem('carbon-auth'));
}

/**
 * Check if H5 page is showing login (unauthenticated).
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  return page.url().includes('/login');
}

/**
 * Create a unique test ID based on timestamp and random number.
 */
export function uniqueId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Wait for antd-mobile toast to appear.
 */
export async function waitForToast(page: Page, timeout = 5000): Promise<string | null> {
  try {
    const toast = page.locator('.adm-toast').first();
    await toast.waitFor({ state: 'visible', timeout });
    return await toast.textContent();
  } catch {
    return null;
  }
}

/**
 * Wait for TabBar to be visible (indicates a full H5 page load).
 */
export async function waitForTabBar(page: Page, timeout = 10000) {
  await page.waitForSelector('.adm-tab-bar', { timeout });
}

/**
 * Wait for the H5 app to be fully ready (network settled + app shell rendered).
 * Use this instead of waitForTimeout after navigation.
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.adm-tab-bar', { timeout: 8000 }).catch(() => {});
}

/**
 * Wait for a specific element to be visible after an action.
 * Use instead of waitForTimeout for post-action waits.
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'visible' | 'attached' } = {}
) {
  const { timeout = 8000, state = 'visible' } = options;
  await page.waitForSelector(selector, { state, timeout });
}

/**
 * Get tab bar items text.
 */
export async function getTabBarItems(page: Page): Promise<string[]> {
  const items = page.locator('.adm-tab-bar-item');
  const count = await items.count();
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    texts.push(await items.nth(i).textContent() || '');
  }
  return texts;
}

/**
 * Click a tab bar item by title text.
 */
export async function clickTabBarItem(page: Page, title: string) {
  const item = page.locator('.adm-tab-bar-item').filter({ hasText: title }).first();
  await item.click();
  await waitForPageReady(page);
}
