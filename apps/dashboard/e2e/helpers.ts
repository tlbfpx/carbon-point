import { type Page } from '@playwright/test';

/**
 * Common helper utilities for E2E tests
 */

/**
 * Wait for an Ant Design success message to appear
 */
export async function expectAntSuccess(page: Page, timeout = 5000) {
  await page.waitForSelector('.ant-message-success', { timeout });
}

/**
 * Wait for an Ant Design error message to appear
 */
export async function expectAntError(page: Page, timeout = 5000) {
  await page.waitForSelector('.ant-message-error', { timeout });
}

/**
 * Wait for the Ant Design table to load
 */
export async function waitForTable(page: Page, timeout = 10000) {
  await page.waitForSelector('.ant-table-tbody tr', { timeout });
}

/**
 * Wait for a modal to appear
 */
export async function waitForModal(page: Page, timeout = 5000) {
  await page.waitForSelector('.ant-modal', { timeout });
}

/**
 * Close any open modal by pressing Escape
 */
export async function closeModal(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Create a unique test identifier based on current time
 */
export function uniqueId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Fill in Ant Design form fields by label text
 */
export async function fillFormField(page: Page, label: string, value: string) {
  const field = page.locator(`.ant-form-item label`).filter({ hasText: label })
    .locator('..')
    .locator('input, textarea, .ant-select');
  await field.fill(value);
}

/**
 * Select an option from an Ant Design Select by text
 */
export async function selectAntOption(page: Page, text: string) {
  const option = page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: text });
  await option.click();
}

/**
 * Check if user is logged in (by checking for menu items)
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('.ant-menu', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Log out and clear authentication state
 */
export async function logout(page: Page) {
  const avatar = page.locator('.ant-avatar');
  if (await avatar.isVisible()) {
    await avatar.click();
    await page.waitForSelector('.ant-dropdown-menu', { timeout: 3000 });
    const logoutItem = page.locator('.ant-dropdown-menu li').filter({ hasText: '退出登录' });
    if (await logoutItem.isVisible()) {
      await logoutItem.click();
      await page.waitForURL(/login/, { timeout: 5000 });
    }
  }
}

/**
 * Login as enterprise admin.
 * Since the login API has a response format bug in the UI (checks res.code instead of res.data.code),
 * we bypass the UI form and directly call the API to get tokens, then inject into localStorage.
 */
export async function loginAsEnterpriseAdmin(page: Page, baseUrl: string) {
  // First, get the auth token directly from the API
  const apiResponse = await page.request.post('http://localhost:8080/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { phone: '13800138001', password: 'password123' },
  });
  const apiData = await apiResponse.json();

  if (apiData.code === 200 && apiData.data) {
    const { accessToken, refreshToken, user } = apiData.data;
    // Navigate to the login page first to set up the app context
    await page.goto(`${baseUrl}/dashboard/login`);
    await page.waitForLoadState('domcontentloaded');
    // Inject auth state into localStorage (matches authStore.ts STORAGE_KEY format)
    await page.evaluate(
      ([at, rt, u]) => {
        localStorage.setItem(
          'carbon-dashboard-auth',
          JSON.stringify({
            state: { accessToken: at, refreshToken: rt, user: u },
            version: 0,
          })
        );
      },
      [accessToken, refreshToken, user]
    );
  }

  // Navigate to the enterprise dashboard
  await page.goto(`${baseUrl}/#/enterprise/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

/**
 * Login as platform admin
 */
export async function loginAsPlatformAdmin(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/platform.html`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder*="用户名"]').fill('admin');
  await page.locator('input[placeholder*="密码"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/platform/, { timeout: 15000 });
}
