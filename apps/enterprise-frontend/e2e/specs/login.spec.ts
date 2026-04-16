import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

const TEST_ACCOUNTS = {
  enterpriseAdmin: {
    phone: '13800138001',
    password: 'password123',
  },
};

test.describe('企业登录测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
  });

  test('LOGIN-E001: 企业登录页面渲染 - 标题正确', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('碳积分');
  });

  test('LOGIN-E002: 企业登录页面渲染 - 手机号输入框存在', async ({ page }) => {
    await expect(page.getByPlaceholder('请输入手机号')).toBeVisible();
  });

  test('LOGIN-E003: 企业登录页面渲染 - 密码输入框存在且加密', async ({ page }) => {
    const pwdInput = page.getByPlaceholder('请输入密码');
    await expect(pwdInput).toBeVisible();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('LOGIN-E004: 企业登录页面渲染 - 提交按钮存在', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('LOGIN-E005: 企业登录 - 有效凭证登录成功', async ({ page }) => {
    await page.getByPlaceholder('请输入手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('请输入密码').fill(TEST_ACCOUNTS.enterpriseAdmin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Should redirect to dashboard
    await expect(page).toHaveURL(/#\/dashboard/);
  });

  test('LOGIN-E006: 企业登录 - 错误密码显示错误提示', async ({ page }) => {
    await page.getByPlaceholder('请输入手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Should show error message (Ant Design message.error)
    await expect(page.locator('.ant-message')).toBeVisible();
  });

  test('LOGIN-E007: 企业登录 - 空手机号显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('请输入密码').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    // Ant Design form validation should show error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('LOGIN-E008: 企业登录 - 空密码显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('请输入手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
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
    await page.getByPlaceholder('请输入手机号').fill(TEST_ACCOUNTS.enterpriseAdmin.phone);
    await page.getByPlaceholder('请输入密码').fill(TEST_ACCOUNTS.enterpriseAdmin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Should be on the enterprise dashboard
    await expect(page).toHaveURL(/#\/dashboard/);
    // Sidebar or menu should be visible
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });
});
