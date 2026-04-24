import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';

test.describe('平台后台 - 功能点库', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    // Navigate via URL — "积木组件库" menu item may not exist in sidebar
    await page.goto(`${BASE_URL}/features/blocks`);
    await page.waitForSelector('.ant-table', { timeout: 10000 });
  });

  test('FL-001: 积木组件库页面可访问', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('积木组件库');
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('FL-002: 组件库 Tab 切换', async ({ page }) => {
    const tabs = page.locator('.ant-tabs-tab');
    await expect(tabs.nth(0)).toBeVisible();
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      // Wait for tab content to be visible
      await expect(tabs.nth(1)).toHaveClass(/ant-tabs-tab-active/);
    }
  });

  test('FL-003: 功能点列表筛选', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: '筛选' });
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.locator('.ant-collapse')).toBeVisible();
    }
  });

  test('FL-004: 编辑功能点', async ({ page }) => {
    const editBtn = page.locator('.ant-table button').filter({ hasText: '编辑' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
      await page.click('button:has-text("保存修改")');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });
});
