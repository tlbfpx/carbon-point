import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 积分运营', () => {
  test('PNT-001: 积分运营页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=积分运营');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '积分' })).toBeVisible();
    await expect(page.locator('.ant-table, .ant-card')).toBeVisible();
  });
});
