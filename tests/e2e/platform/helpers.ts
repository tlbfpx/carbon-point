import { type Page } from '@playwright/test';
import { BASE_URL, API_BASE, PLATFORM_ADMIN } from './config';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_KEY = 'carbon-platform-auth';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'e2e', 'fixtures');
const CACHED_CREDS_FILE = path.join(FIXTURES_DIR, '.platform-creds.json');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

/**
 * Inject platform auth into localStorage without going through the UI login form.
 * Calls the API directly and stores tokens.
 */
export async function loginAsPlatformAdmin(
  page: Page,
  username: string = PLATFORM_ADMIN.username,
  password: string = PLATFORM_ADMIN.password
): Promise<{ accessToken: string; refreshToken: string; admin: unknown } | null> {
  try {
    const resp = await page.request.post(`${API_BASE}/platform/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { username, password },
    });

    const body = await resp.json() as {
      code?: string | number;
      data?: {
        accessToken: string;
        refreshToken: string;
        admin: {
          id: number;
          username: string;
          displayName?: string;
          phone?: string;
          email?: string;
          role: string;
        };
      };
    };

    const successCodes = ['0000', '0', 0, '200', 200];
    if (!successCodes.includes(body.code as string | number) || !body.data?.accessToken) {
      console.warn('[platform helpers] Login failed:', JSON.stringify(body));
      return null;
    }

    const { accessToken, refreshToken, admin } = body.data;

    // Transform admin to match AdminUser interface expected by the frontend
    const user = {
      userId: String(admin.id),
      username: admin.displayName || admin.username || username,
      phone: admin.phone,
      email: admin.email,
      roles: [admin.role || 'admin'],
      permissions: [],
      isPlatformAdmin: true,
    };

    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Inject auth state into localStorage
    await page.evaluate(
      ([at, rt, u]) => {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            state: { accessToken: at, refreshToken: rt, user: u },
            version: 0,
          })
        );
      },
      [accessToken, refreshToken, user] as [string, string, object]
    );

    // Reload so Zustand hydrates from localStorage
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Cache credentials for reuse
    fs.writeFileSync(CACHED_CREDS_FILE, JSON.stringify({ username, password, apiBase: API_BASE }));

    return { accessToken, refreshToken, admin };
  } catch (e) {
    console.warn('[platform helpers] loginAsPlatformAdmin failed:', e);
    return null;
  }
}

/**
 * Navigate to a protected platform page (auto-injects auth if needed).
 */
export async function navigateToPlatformPage(page: Page, route: string = '/platform/dashboard') {
  // Try to inject auth from cache if not already authenticated
  const authState = await page.evaluate(() => localStorage.getItem(STORAGE_KEY));
  if (!authState) {
    await loginAsPlatformAdmin(page);
  }
  await page.goto(`${BASE_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Clear platform auth from localStorage.
 */
export async function clearPlatformAuth(page: Page) {
  await page.evaluate(() => localStorage.removeItem(STORAGE_KEY));
}

/**
 * Check if the current page is the login page.
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  return page.url().includes('/login');
}

// ============ Ant Design Helpers ============

/**
 * Wait for an Ant Design success message.
 */
export async function waitForAntSuccess(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('.ant-message-success', { timeout });
}

/**
 * Wait for an Ant Design error message.
 */
export async function waitForAntError(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('.ant-message-error', { timeout });
}

/**
 * Wait for the Ant Design table to render rows.
 */
export async function waitForTable(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('.ant-table-tbody tr', { timeout });
}

/**
 * Wait for a modal to be visible.
 */
export async function waitForModal(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('.ant-modal', { timeout });
}

/**
 * Close an open modal via the close button.
 */
export async function closeModal(page: Page): Promise<void> {
  const closeBtn = page.locator('.ant-modal-close');
  if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Close an open modal via Escape key.
 */
export async function closeModalEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

/**
 * Create a unique test identifier.
 */
export function uniqueId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Take a screenshot and save it to reports/screenshots/.
 */
export async function takeScreenshot(page: Page, name: string): Promise<string> {
  const screenshotsDir = path.join(process.cwd(), 'reports', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * Wait for Ant Design message to disappear.
 */
export async function waitForMessageGone(page: Page, timeout = 3000): Promise<void> {
  await page.waitForSelector('.ant-message', { state: 'hidden', timeout }).catch(() => {});
}

/**
 * Fill an Ant Design form field by label text.
 */
export async function fillFormField(page: Page, labelText: string, value: string): Promise<void> {
  const label = page.locator(`.ant-form-item-label label`).filter({ hasText: labelText }).first();
  const formItem = label.locator('..');
  const input = formItem.locator('input').first();
  await input.fill(value);
}

/**
 * Select an option from an Ant Design Select by text.
 */
export async function selectAntOption(page: Page, text: string): Promise<void> {
  const option = page.locator('.ant-select-dropdown .ant-select-item-option').filter({ hasText: text }).first();
  await option.click();
}

/**
 * Click an Ant Design Popconfirm's confirm button.
 */
export async function confirmPopconfirm(page: Page, okText = '确定'): Promise<void> {
  await page.waitForSelector('.ant-popover', { timeout: 3000 });
  const confirmBtn = page.locator('.ant-popover .ant-btn-primary').filter({ hasText: okText });
  await confirmBtn.click();
  await page.waitForTimeout(500);
}

/**
 * Dismiss an Ant Design Popconfirm by clicking cancel.
 */
export async function cancelPopconfirm(page: Page): Promise<void> {
  await page.waitForSelector('.ant-popover', { timeout: 3000 });
  const cancelBtn = page.locator('.ant-popover .ant-btn').filter({ hasText: '取消' });
  await cancelBtn.click();
  await page.waitForTimeout(300);
}

/**
 * Click a menu item in the sidebar by text.
 */
export async function clickSidebarMenu(page: Page, text: string): Promise<void> {
  await page.locator('.ant-menu-item, .ant-menu-submenu-title').filter({ hasText: text }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Check if the page has an empty state placeholder.
 */
export async function hasEmptyState(page: Page): Promise<boolean> {
  try {
    return await page.locator('.ant-table-placeholder').isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Get the text content of the pagination total text.
 */
export async function getPaginationTotal(page: Page): Promise<number> {
  const totalText = page.locator('.ant-pagination-total-text');
  const text = await totalText.textContent();
  const match = text?.match(/共\s*(\d+)\s*条/);
  return match ? parseInt(match[1], 10) : 0;
}
