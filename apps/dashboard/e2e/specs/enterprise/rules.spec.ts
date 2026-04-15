import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 规则配置', () => {
  test('RUL-001: 规则配置页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=规则配置');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '规则' })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });
});
