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
  // Wait for modal to be hidden
  await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 5000 });
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
 * Login as platform admin via UI.
 * This is more reliable than localStorage injection for testing.
 */
export async function loginAsPlatformAdmin(page: Page, baseUrl: string) {
  // Navigate to login page
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

  // Fill login form (correct placeholder from PlatformLoginPage)
  await page.getByPlaceholder('请输入管理员用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('admin123');

  // Click login button
  await page.locator('button[type="submit"]').click();

  // Wait for navigation to dashboard and layout to be visible
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ant-layout-content', { timeout: 30000 });
}
