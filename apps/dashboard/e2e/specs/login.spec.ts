import { test, expect } from '@playwright/test';

test.describe('登录测试', () => {
  test('LOGIN-001: 企业登录页面渲染', async ({ page }) => {
    await page.goto('/dashboard/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('碳积分');
    await expect(page.locator('input[placeholder*="手机号"]')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '登 录' })).toBeVisible();
  });

  test('LOGIN-002: 平台登录页面渲染', async ({ page }) => {
    await page.goto('/saas/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('平台管理');
    await expect(page.locator('input[placeholder*="管理员"]')).toBeVisible();
  });
});
