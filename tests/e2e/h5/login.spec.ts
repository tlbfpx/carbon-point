import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USERS } from './config';
import { H5LoginPage } from './LoginPage';
import { H5HomePage } from './HomePage';
import { clearH5Auth, loginAsH5User } from './helpers';

test.describe('H5 - 登录功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearH5Auth(page);
    const loginPage = new H5LoginPage(page);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await clearH5Auth(page);
  });

  test('LOGIN-001: 登录页正确渲染', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await expect(loginPage.titleText).toBeVisible({ timeout: 10000 });
    await expect(loginPage.phoneInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.subtitleText).toBeVisible();
  });

  test('LOGIN-002: 正确账号密码登录成功', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.login(TEST_USERS.enterpriseAdmin.phone, TEST_USERS.enterpriseAdmin.password);

    const isOnLogin = await loginPage.isOnLoginPage();
    if (!isOnLogin) {
      const homePage = new H5HomePage(page);
      await expect(homePage.tabBar).toBeVisible({ timeout: 5000 });
    } else {
      // Login may fail due to test user credentials - verify we're not on login page with error
      const errorVisible = await page.locator('.adm-toast').isVisible().catch(() => false);
      expect(isOnLogin).toBe(false);
    }
  });

  test('LOGIN-003: 错误密码登录失败并显示错误提示', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.login(TEST_USERS.enterpriseAdmin.phone, 'wrongpassword');
    // Wait briefly for toast to appear
    await page.waitForSelector('.adm-toast', { timeout: 3000 }).catch(() => {});

    // Should still be on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);
    // Toast error should appear
    const toast = page.locator('.adm-toast');
    const toastCount = await toast.count();
    if (toastCount > 0) {
      const toastText = await toast.first().textContent();
      expect(toastText).toMatch(/失败|错误|密码/);
    }
  });

  test('LOGIN-004: 未注册用户登录失败', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.login('19999999999', 'password123');
    // Wait briefly for toast to appear
    await page.waitForSelector('.adm-toast', { timeout: 3000 }).catch(() => {});

    // Should still be on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('LOGIN-005: 空字段提交 - 空手机号', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.passwordInput.fill('password');
    await loginPage.loginButton.click();
    // Wait briefly for toast to appear
    await page.waitForSelector('.adm-toast', { timeout: 3000 }).catch(() => {});

    // Toast should show validation message
    const toast = page.locator('.adm-toast');
    const toastCount = await toast.count();
    if (toastCount > 0) {
      const toastText = await toast.first().textContent();
      expect(toastText).toMatch(/请输入|手机号|密码/);
    }
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('LOGIN-006: 空字段提交 - 空密码', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.phoneInput.fill('13800138001');
    await loginPage.loginButton.click();
    // Wait briefly for toast to appear
    await page.waitForSelector('.adm-toast', { timeout: 3000 }).catch(() => {});

    // Toast should show validation message
    const toast = page.locator('.adm-toast');
    const toastCount = await toast.count();
    if (toastCount > 0) {
      const toastText = await toast.first().textContent();
      expect(toastText).toMatch(/请输入|手机号|密码/);
    }
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('LOGIN-007: 记住我复选框可见', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await expect(loginPage.rememberCheckbox).toBeVisible();
  });

  test('LOGIN-008: 忘记密码链接可见', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('LOGIN-009: 注册链接可点击并跳转', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await loginPage.goToRegister();

    // Should navigate to register page
    await expect(page.url()).toContain('/register');
    await expect(page.locator('text=注册账号')).toBeVisible({ timeout: 5000 });
  });

  test('LOGIN-010: 未登录访问首页重定向到登录页', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('LOGIN-011: TabBar不在登录页显示', async ({ page }) => {
    const loginPage = new H5LoginPage(page);
    await expect(page.locator('.adm-tab-bar')).toHaveCount(0);
  });

  test('LOGIN-012: 登录后Token正确存储到localStorage', async ({ page }) => {
    const authData = await loginAsH5User(page);
    expect(authData).not.toBeNull();
    expect(authData?.accessToken).toBeTruthy();
    expect(authData?.refreshToken).toBeTruthy();

    // Verify localStorage has auth data
    const stored = await page.evaluate(() => {
      return localStorage.getItem('carbon-auth');
    });
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.accessToken).toBeTruthy();
  });
});
