import { test as setup, expect } from '@playwright/test';

/**
 * Platform Admin Authentication Setup
 * Authenticates as a platform admin user and saves the session state.
 * Run: npx playwright test --project setup-platform-admin
 */
setup('platform admin login', async ({ page }) => {
  const username = process.env.PLATFORM_ADMIN_USERNAME || 'admin';
  const password = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123';

  // Navigate to platform login
  await page.goto('/saas/login');

  // Fill in credentials
  await page.getByPlaceholder('请输入管理员用户名').fill(username);
  await page.getByPlaceholder('请输入密码').fill(password);

  // Submit
  await page.getByRole('button', { name: '登录' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/saas\/platform\/dashboard/, { timeout: 15000 });

  // Save authentication state
  await page.context().storageState({
    path: 'e2e/.auth/platform-admin.json',
  });
});
