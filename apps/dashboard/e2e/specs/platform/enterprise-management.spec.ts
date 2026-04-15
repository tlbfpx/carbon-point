import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

test.describe('平台后台 - 企业管理', () => {
  test('EM-001: 企业管理页面可访问', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=企业管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '企业管理' })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('EM-002: 开通企业按钮可见', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.click('text=企业管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '开通企业' })).toBeVisible();
  });
});
