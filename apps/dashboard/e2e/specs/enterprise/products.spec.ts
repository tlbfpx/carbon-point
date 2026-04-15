import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 商品管理', () => {
  test('PRD-001: 商品管理页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=商品管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '商品' })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });
});
