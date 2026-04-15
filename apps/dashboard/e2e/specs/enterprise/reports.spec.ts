import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 数据报表', () => {
  test('RPT-001: 数据报表页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=数据报表');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '数据报表' })).toBeVisible();
  });

  test('RPT-002: 导出按钮可见', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=数据报表');
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '导出' })).toBeVisible();
  });
});
