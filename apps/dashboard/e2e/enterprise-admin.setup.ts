import { test as setup } from '@playwright/test';

/**
 * Enterprise Super Admin Authentication Setup
 * Authenticates as an enterprise super admin and saves the session state.
 * Run: npx playwright test --project setup-enterprise-admin
 */
setup('enterprise super admin login', async ({ page }) => {
  const phone = process.env.ENTERPRISE_ADMIN_PHONE || '13800138001';
  const password = process.env.ENTERPRISE_ADMIN_PASSWORD || 'password123';

  // Navigate to enterprise login
  await page.goto('/dashboard/login');

  // Fill in credentials
  await page.getByPlaceholder('请输入手机号').fill(phone);
  await page.getByPlaceholder('请输入密码').fill(password);

  // Submit
  await page.getByRole('button', { name: '登录' }).click();

  // Wait for redirect to enterprise dashboard
  await page.waitForURL(/\/dashboard\/enterprise\/dashboard/, { timeout: 15000 });

  // Save authentication state
  await page.context().storageState({
    path: 'e2e/.auth/enterprise-admin.json',
  });
});
