import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';

const TEST_ACCOUNTS = {
  enterpriseAdmin: {
    phone: '13800030001',
    password: '123456',
  },
};

test.describe('企业登录测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Wait for the Ant Design form to be visible
    await page.waitForSelector('.ant-form', { timeout: 30000 });
  });

  test('LOGIN-E001: 企业登录页面渲染 - 标题正确', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('碳积分');
  });

  test('LOGIN-E002: 企业登录页面渲染 - 手机号输入框存在', async ({ page }) => {
    await expect(page.getByPlaceholder('手机号')).toBeVisible();
  });

  test('LOGIN-E003: 企业登录页面渲染 - 密码输入框存在且加密', async ({ page }) => {
    const pwdInput = page.getByPlaceholder('密码');
    await expect(pwdInput).toBeVisible();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('LOGIN-E004: 企业登录页面渲染 - 提交按钮存在', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('LOGIN-E005: 企业登录 - 有效凭证登录成功', async ({ page }) => {
    await page.getByPlaceholder('手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('密码').fill(TEST_ACCOUNTS.enterpriseAdmin.password);
    await page.locator('button[type="submit"]').click();
    // Wait for navigation to dashboard
    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    } catch {
      // If navigation fails, check for error message to help diagnose
      const formError = await page.locator('div[style*="errorText"]').first().textContent().catch(() => '');
      throw new Error(`Login failed to navigate to dashboard. Form error text: ${formError}`);
    }
  });

  test('LOGIN-E006: 企业登录 - 错误密码显示错误提示', async ({ page }) => {
    await page.getByPlaceholder('手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('密码').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // The login page shows error in a custom styled div (not ant-message)
    await expect(page.locator('text=用户名或密码错误')).toBeVisible({ timeout: 15000 });
  });

  test('LOGIN-E007: 企业登录 - 空手机号显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('密码').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    // Ant Design form validation should show error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('LOGIN-E008: 企业登录 - 空密码显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.locator('button[type="submit"]').click();
    // Ant Design form validation should show error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('LOGIN-E009: 企业登录 - 记住我复选框功能正常', async ({ page }) => {
    const rememberMe = page.getByLabel('记住我');
    // Checkbox should be visible and unchecked by default
    await expect(rememberMe).toBeVisible();
    await expect(rememberMe).not.toBeChecked();
    // Click to check
    await rememberMe.check();
    await expect(rememberMe).toBeChecked();
    // Click again to uncheck
    await rememberMe.uncheck();
    await expect(rememberMe).not.toBeChecked();
  });

  test('LOGIN-E010: 企业登录 - 登录成功后重定向到仪表盘', async ({ page }) => {
    await page.getByPlaceholder('手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('密码').fill(TEST_ACCOUNTS.enterpriseAdmin.password);
    await page.locator('button[type="submit"]').click();
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    // Sidebar should be visible after successful login
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });
});
