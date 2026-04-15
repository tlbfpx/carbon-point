import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 员工管理', () => {
  test('MEM-001: 员工管理页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=员工管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('h2').filter({ hasText: '员工' })).toBeVisible();
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('MEM-002: 添加员工按钮可见', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=员工管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '添加' })).toBeVisible();
  });

  test('MEM-003: 批量导入按钮存在', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.click('text=员工管理');
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '批量导入' })).toBeVisible();
  });
});
