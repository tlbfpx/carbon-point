import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';
import { MemberPage } from '../../pages/enterprise/MemberPage';

test.describe('企业后台 - 员工管理', () => {
  test('MEM-001: 员工管理页面可访问', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('text=员工管理').first().click({ force: true });
    await page.waitForTimeout(2000);
    const memberPage = new MemberPage(page);
    await expect(memberPage.table).toBeVisible();
  });

  test('MEM-002: 添加员工按钮可见', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('text=员工管理').first().click({ force: true });
    await page.waitForTimeout(2000);
    const memberPage = new MemberPage(page);
    await expect(memberPage.addButton).toBeVisible();
  });

  test('MEM-003: 批量导入按钮存在', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('text=员工管理').first().click({ force: true });
    await page.waitForTimeout(2000);
    await expect(page.locator('button').filter({ hasText: '批量导入' })).toBeVisible();
  });
});
