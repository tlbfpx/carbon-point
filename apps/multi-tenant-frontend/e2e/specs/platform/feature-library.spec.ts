import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';

test.describe('平台后台 - 功能点库', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/platform/features/features`);
    await page.waitForLoadState('networkidle');
  });

  test('FL-001: 功能点库页面可访问', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('功能点库');
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('FL-002: 创建功能点', async ({ page }) => {
    const featureName = `测试功能点_${uniqueId()}`;
    const featureCode = `TEST_FEATURE_${Date.now()}`;

    await page.click('button:has-text("创建功能点")');
    await expect(page.locator('.ant-modal')).toBeVisible();

    await page.fill('input[placeholder*="功能点名称"]', featureName);
    await page.fill('input[placeholder*="功能点编码"]', featureCode);
    await page.click('.ant-select:has-text("类型")');
    await page.click('.ant-select-dropdown li:first-child');

    await page.click('button:has-text("确认创建")');
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('FL-003: 功能点列表筛选', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: '筛选' });
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.locator('.ant-collapse')).toBeVisible();
    }
  });

  test('FL-004: 编辑功能点', async ({ page }) => {
    await page.waitForTimeout(1000);
    const editBtn = page.locator('.ant-table button').filter({ hasText: '编辑' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
      await page.click('button:has-text("保存修改")');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });
});
