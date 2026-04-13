import { test as setup } from '@playwright/test';

/**
 * Enterprise Operator Authentication Setup
 * Authenticates as an enterprise operator (limited permissions) and saves the session state.
 * Run: npx playwright test --project setup-enterprise-operator
 */
setup('enterprise operator login', async ({ page }) => {
  const phone = process.env.ENTERPRISE_OPERATOR_PHONE || '13800138002';
  const password = process.env.ENTERPRISE_OPERATOR_PASSWORD || 'password123';

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
    path: 'e2e/.auth/enterprise-operator.json',
  });
});
