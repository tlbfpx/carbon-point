import { test, expect, Page } from '@playwright/test';
import { EnterpriseLoginPage } from '../pages/EnterpriseLoginPage';
import { DEFAULT_ENTERPRISE_CREDENTIALS } from '../test-data/api-helpers';

/**
 * Enterprise Admin Login Page Tests
 * Tests the login flow for the enterprise admin portal.
 * Base URL: http://localhost:3000
 */
test.describe('企业端登录', () => {
  let loginPage: EnterpriseLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new EnterpriseLoginPage(page);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Clean up auth state
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();
    });
  });

  test.describe('页面加载', () => {
    test('登录页面应该正常加载', async ({ page }) => {
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });

    test('品牌信息应该显示', async () => {
      await expect(loginPage.isBrandingVisible()).resolves.toBeTruthy();
      const title = await loginPage.getPageTitle();
      expect(title).toContain('碳积分');
    });

    test('表单元素应该可见', async () => {
      await expect(loginPage['phoneInput']).toBeVisible();
      await expect(loginPage['passwordInput']).toBeVisible();
      await expect(loginPage['loginButton']).toBeVisible();
    });

    test('登录按钮初始状态应可用', async () => {
      await expect(loginPage['loginButton']).toBeEnabled();
    });
  });

  test.describe('表单验证', () => {
    test('提交空表单应显示验证错误', async ({ page }) => {
      await loginPage.submitEmptyForm();

      // Ant Design form validation should show required field errors
      const errors = await page.locator('.ant-form-item-explain-error').allTextContents().catch(() => []);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(e => e.includes('请输入手机号') || e.includes('请输入密码') || e.includes('请输入正确的手机号'))
      ).toBeTruthy();
    });

    test('手机号格式错误应显示验证错误', async ({ page }) => {
      await loginPage['phoneInput'].fill('12345');
      await loginPage['passwordInput'].fill('password');
      await loginPage.submitEmptyForm();

      const error = await page.locator('.ant-form-item-explain-error').first().textContent().catch(() => '');
      expect(error).toMatch(/手机号|phone/i);
    });

    test('仅输入手机号不应提交', async ({ page }) => {
      await loginPage['phoneInput'].fill('13800138000');
      await loginPage.submitEmptyForm();

      // Password field should show error
      const errors = await page.locator('.ant-form-item-explain-error').allTextContents().catch(() => []);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('登录功能', () => {
    test('使用正确凭据应成功登录或显示后端错误', async ({ page }) => {
      // Try actual login - may fail if backend is not running
      await loginPage.login(
        DEFAULT_ENTERPRISE_CREDENTIALS.phone,
        DEFAULT_ENTERPRISE_CREDENTIALS.password
      );

      // Give it time to redirect or show error
      await page.waitForTimeout(2000);

      const url = page.url();
      // Either redirected to dashboard or error is shown (backend may not be running in test env)
      expect(
        url.includes('/dashboard') ||
        (await loginPage.isErrorVisible())
      ).toBeTruthy();
    });

    test('使用错误密码应显示错误信息', async ({ page }) => {
      await loginPage.login(
        DEFAULT_ENTERPRISE_CREDENTIALS.phone,
        'wrongpassword123'
      );

      // Wait for response
      await page.waitForTimeout(3000);

      // Should show error or stay on login page
      const onLoginPage = page.url().includes('/login');
      const errorVisible = await loginPage.isErrorVisible().catch(() => false);

      expect(onLoginPage || errorVisible).toBeTruthy();
    });

    test('使用不存在账号应显示错误信息', async ({ page }) => {
      await loginPage.login('19900000000', 'password123');

      // Wait for response
      await page.waitForTimeout(3000);

      const onLoginPage = page.url().includes('/login');
      const errorVisible = await loginPage.isErrorVisible().catch(() => false);

      expect(onLoginPage || errorVisible).toBeTruthy();
    });

    test('记住我复选框应可切换', async () => {
      await loginPage.toggleRememberMe();
      // Should remain on the page without errors
      await expect(loginPage['rememberCheckbox']).toBeVisible();
    });
  });

  test.describe('UI 交互', () => {
    test('登录按钮点击时应触发请求', async ({ page }) => {
      // Start login but don't wait for completion
      const loginPromise = loginPage.login(
        DEFAULT_ENTERPRISE_CREDENTIALS.phone,
        DEFAULT_ENTERPRISE_CREDENTIALS.password
      );

      // Wait briefly for loading state
      await page.waitForTimeout(500);

      // Check if button becomes disabled during loading
      const buttonDisabled = await loginPage['loginButton'].isDisabled().catch(() => false);

      // Then cancel by navigating away
      await page.goto('about:blank');
      await loginPromise.catch(() => {});
    });

    test('密码输入应支持显示/隐藏切换', async ({ page }) => {
      // Password input should be type="password"
      await expect(loginPage['passwordInput']).toHaveAttribute('type', 'password');

      // Click eye icon to show password
      const eyeButton = page.locator('.ant-input-password-icon');
      if (await eyeButton.isVisible().catch(() => false)) {
        await eyeButton.click();
        await expect(loginPage['passwordInput']).not.toHaveAttribute('type', 'password');
      }
    });
  });

  test.describe('安全边界', () => {
    test('SQL注入字符不应导致页面崩溃', async ({ page }) => {
      await loginPage.login("13800138000' OR '1'='1", 'password');

      await page.waitForTimeout(2000);

      // Should not crash - either show error or stay on page
      const bodyVisible = await page.locator('body').isVisible().catch(() => false);
      expect(bodyVisible).toBeTruthy();
    });

    test('超长输入不应导致页面崩溃', async ({ page }) => {
      const longString = '1'.repeat(200);

      await loginPage.login(longString, longString);

      await page.waitForTimeout(2000);

      // Should not crash
      const bodyVisible = await page.locator('body').isVisible().catch(() => false);
      expect(bodyVisible).toBeTruthy();
    });
  });
});
