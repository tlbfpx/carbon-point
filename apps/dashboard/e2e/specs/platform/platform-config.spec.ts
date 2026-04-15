import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

test.describe('平台后台 - 平台配置', () => {
  test('PC-001: 平台配置页面可访问', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=平台配置');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '平台配置' })).toBeVisible();
    await expect(page.locator('.ant-form')).toBeVisible();
  });

  test('PC-002: 保存按钮可见', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=平台配置');
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '保存' })).toBeVisible();
  });
});
