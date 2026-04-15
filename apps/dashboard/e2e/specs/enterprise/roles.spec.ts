import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 角色权限', () => {
  test('ROL-001: 角色权限页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=角色权限');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '角色' })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });
});
