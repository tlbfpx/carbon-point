import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

test.describe('平台后台 - 系统管理', () => {
  test('SM-001: 系统管理页面可访问', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=系统管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '系统管理' })).toBeVisible();
    await expect(page.locator('.ant-tabs')).toBeVisible();
  });
});
