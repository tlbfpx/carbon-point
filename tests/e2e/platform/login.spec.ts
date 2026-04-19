import { test, expect } from '@playwright/test';
import { PlatformLoginPage } from './pages/LoginPage';
import { loginAsPlatformAdmin, navigateToPlatformPage, clearPlatformAuth, isOnLoginPage } from './helpers';
import { BASE_URL, PLATFORM_ADMIN } from './config';

/**
 * Platform Admin Login Tests
 *
 * Tests the platform login page at /login
 * Covers: successful login, failed login (wrong credentials), form validation
 */
test.describe('Platform Login', () => {

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth before each test
    await clearPlatformAuth(page);
  });

  test.afterEach(async ({ page }) => {
    await clearPlatformAuth(page);
  });

  // ========== UI Rendering Tests ==========

  test('should display login page with all required elements', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toHaveText('登录');
    await expect(loginPage.usernameInput).toHaveAttribute('placeholder', '请输入管理员用户名');
    await expect(loginPage.passwordInput).toHaveAttribute('placeholder', '请输入密码');
  });

  test('should display platform title and branding', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    // Check for platform title in the card
    await expect(page.getByText('平台管理后台')).toBeVisible();
    await expect(page.getByText('SaaS 多租户运营管理系统')).toBeVisible();
  });

  test('should show forget password link', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();
    await expect(page.getByText('忘记密码？')).toBeVisible();
  });

  test('should show footer links', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();
    await expect(page.getByText('帮助中心')).toBeVisible();
    await expect(page.getByText('服务条款')).toBeVisible();
    await expect(page.getByText('隐私政策')).toBeVisible();
  });

  // ========== Form Validation Tests ==========

  test('should show validation error when username is empty', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    // Submit without filling username
    await loginPage.passwordInput.fill('password');
    await loginPage.submitButton.click();
    await page.waitForTimeout(500);

    // Ant Design validation should prevent submission
    // The form has required validation on username field
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('should show validation error when password is empty', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.usernameInput.fill('admin');
    await loginPage.submitButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('should show validation error when both fields are empty', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.submitButton.click();
    await page.waitForTimeout(500);

    // Ant Design should show validation messages
    const errors = page.locator('.ant-form-item-explain-error');
    const count = await errors.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show validation error when username is too short', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.usernameInput.fill('a');
    await loginPage.passwordInput.fill('password123');
    await loginPage.submitButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  // ========== Failed Login Tests ==========

  test('should show error message on invalid credentials', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login('wronguser', 'wrongpassword');
    await page.waitForTimeout(2000);

    // Should show error alert or message
    const hasAlert = await page.locator('.ant-alert').isVisible();
    const hasErrorMessage = await page.locator('.ant-message-error').isVisible();
    expect(hasAlert || hasErrorMessage).toBeTruthy();
  });

  test('should show error on correct username but wrong password', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login(PLATFORM_ADMIN.username, 'wrongpassword');
    await page.waitForTimeout(2000);

    const hasAlert = await page.locator('.ant-alert').isVisible();
    const hasErrorMessage = await page.locator('.ant-message-error').isVisible();
    expect(hasAlert || hasErrorMessage).toBeTruthy();
  });

  test('should remain on login page after failed login', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login('wronguser', 'wrongpassword');
    await page.waitForTimeout(2000);

    // Should stay on login page
    const onLogin = await isOnLoginPage(page);
    expect(onLogin).toBeTruthy();
  });

  // ========== Successful Login Tests ==========

  test('should redirect to dashboard after successful login', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login(PLATFORM_ADMIN.username, PLATFORM_ADMIN.password);

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 10000 });
  });

  test('should display platform sidebar after successful login', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login(PLATFORM_ADMIN.username, PLATFORM_ADMIN.password);
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 10000 });

    // Sidebar should be visible
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-menu')).toBeVisible();
  });

  test('should display dashboard menu items after login', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();

    await loginPage.login(PLATFORM_ADMIN.username, PLATFORM_ADMIN.password);
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 10000 });

    // Check menu items are visible
    await expect(page.locator('.ant-menu-item').filter({ hasText: '平台看板' })).toBeVisible();
    await expect(page.locator('.ant-menu-item').filter({ hasText: '企业管理' })).toBeVisible();
    await expect(page.locator('.ant-menu-submenu-title').filter({ hasText: '系统管理' })).toBeVisible();
  });

  // ========== Auth State Tests ==========

  test('should persist auth after page reload', async ({ page }) => {
    const loginPage = new PlatformLoginPage(page);
    await loginPage.goto();
    await loginPage.login(PLATFORM_ADMIN.username, PLATFORM_ADMIN.password);
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 10000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Should still be on dashboard (auth persisted in localStorage)
    const url = page.url();
    expect(url).toMatch(/\/platform\/dashboard/);
  });

  test('should navigate to login when auth is cleared', async ({ page }) => {
    // First login
    await loginAsPlatformAdmin(page);

    // Navigate to dashboard
    await page.goto(BASE_URL + '/platform/dashboard');
    await page.waitForLoadState('networkidle');

    // Clear auth
    await clearPlatformAuth(page);

    // Try to navigate to dashboard again
    await page.goto(BASE_URL + '/platform/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should be redirected to login
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should use API auth helper to login', async ({ page }) => {
    const result = await loginAsPlatformAdmin(page);
    expect(result).not.toBeNull();
    expect(result?.accessToken).toBeDefined();
    expect(result?.refreshToken).toBeDefined();
    expect(result?.admin).toBeDefined();
  });

  // ========== Redirect Tests ==========

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Clear auth first
    await clearPlatformAuth(page);

    // Try to access dashboard directly
    await page.goto(BASE_URL + '/platform/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should be redirected to login
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should redirect to login for all protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/platform/dashboard',
      '/platform/enterprises',
      '/platform/system/users',
      '/platform/system/roles',
      '/platform/system/logs',
      '/platform/system/dict',
      '/platform/config',
    ];

    for (const route of protectedRoutes) {
      await clearPlatformAuth(page);
      await page.goto(BASE_URL + route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const url = page.url();
      expect(url).toContain('/login');
    }
  });
});
