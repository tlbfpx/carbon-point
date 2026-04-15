import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

const TEST_ACCOUNTS = {
  platformAdmin: {
    username: 'admin',
    password: 'admin123',
  },
  enterpriseAdmin: {
    phone: '13800138001',
    password: 'password123',
  },
};

test.describe('企业登录测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/dashboard/login`);
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
    // Should redirect to dashboard (HashRouter format)
    await expect(page).toHaveURL(/#\/enterprise\/dashboard/);
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
    // Should be on the enterprise dashboard (HashRouter format)
    await expect(page).toHaveURL(/#\/enterprise\/dashboard/);
    // Sidebar or menu should be visible
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });
});

test.describe('平台登录测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/platform.html`);
    await page.waitForLoadState('networkidle');
  });

  test('LOGIN-P001: 平台登录页面渲染 - 标题正确', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('平台');
  });

  test('LOGIN-P002: 平台登录页面渲染 - 用户名输入框存在', async ({ page }) => {
    await expect(page.getByPlaceholder('请输入管理员用户名')).toBeVisible();
  });

  test('LOGIN-P003: 平台登录页面渲染 - 密码输入框存在且加密', async ({ page }) => {
    const pwdInput = page.getByPlaceholder('请输入密码');
    await expect(pwdInput).toBeVisible();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('LOGIN-P004: 平台登录页面渲染 - 提交按钮存在', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('LOGIN-P005: 平台登录 - 有效凭证登录成功', async ({ page }) => {
    await page.getByPlaceholder('请输入管理员用户名').fill(TEST_ACCOUNTS.platformAdmin.username);
    await page.getByPlaceholder('请输入密码').fill(TEST_ACCOUNTS.platformAdmin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Should redirect to platform dashboard (HashRouter format)
    await expect(page).toHaveURL(/#\/platform\/dashboard/);
  });

  test('LOGIN-P006: 平台登录 - 错误密码显示错误提示', async ({ page }) => {
    await page.getByPlaceholder('请输入管理员用户名').fill(TEST_ACCOUNTS.platformAdmin.username);
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Should show error message (Ant Design message.error)
    await expect(page.locator('.ant-message')).toBeVisible();
  });

  test('LOGIN-P007: 平台登录 - 空用户名显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('请输入密码').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    // Ant Design form validation should show error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('LOGIN-P008: 平台登录 - 空密码显示验证错误', async ({ page }) => {
    await page.getByPlaceholder('请输入管理员用户名').fill(TEST_ACCOUNTS.platformAdmin.username);
    await page.locator('button[type="submit"]').click();
    // Ant Design form validation should show error
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible();
  });

  test('LOGIN-P009: 平台登录 - 会话登录后保持', async ({ page, context }) => {
    await page.getByPlaceholder('请输入管理员用户名').fill(TEST_ACCOUNTS.platformAdmin.username);
    await page.getByPlaceholder('请输入密码').fill(TEST_ACCOUNTS.platformAdmin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    // Verify we're logged in (HashRouter format)
    await expect(page).toHaveURL(/#\/platform\/dashboard/);
    // Reload the page - should still be logged in (session persists)
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Should still be on dashboard after reload
    await expect(page).toHaveURL(/#\/platform\/dashboard/);
  });

  test('LOGIN-P010: 平台登录 - 平台登出功能正常', async ({ page }) => {
    await page.getByPlaceholder('请输入管理员用户名').fill(TEST_ACCOUNTS.platformAdmin.username);
    await page.getByPlaceholder('请输入密码').fill(TEST_ACCOUNTS.platformAdmin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/#\/platform\/dashboard/);
    // Click the avatar to open user dropdown menu
    const avatar = page.locator('.ant-avatar');
    await avatar.click({ force: true });
    await page.waitForTimeout(500);
    // Find and click logout in the dropdown menu
    const logoutItem = page.locator('.ant-dropdown-menu li').filter({ hasText: '退出登录' });
    await logoutItem.click({ force: true });
    // Should redirect back to login page
    await page.waitForURL(/platform\.html.*login/, { timeout: 10000 });
  });
});
