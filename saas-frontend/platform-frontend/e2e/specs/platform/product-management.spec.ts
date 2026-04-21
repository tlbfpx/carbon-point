import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';

test.describe('平台后台 - 产品管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/features/products`);
    await page.waitForLoadState('networkidle');
  });

  test('PM-001: 产品管理页面可访问', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('产品管理');
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('PM-002: 创建产品', async ({ page }) => {
    const productName = `测试产品_${uniqueId()}`;
    const productCode = `TEST_${Date.now()}`;

    await page.click('button:has-text("快速创建")');
    await expect(page.locator('.ant-modal')).toBeVisible();

    await page.fill('input[placeholder*="产品名称"]', productName);
    await page.fill('input[placeholder*="编码"]', productCode);

    await page.click('.ant-modal button:has-text("确认创建")');
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('PM-003: 产品列表筛选', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: '筛选' });
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await expect(page.locator('.ant-collapse')).toBeVisible();
    }
  });

  test('PM-004: 编辑产品', async ({ page }) => {
    const editBtn = page.locator('.ant-table button').filter({ hasText: '编辑' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
      await page.fill('input[placeholder*="产品名称"]', `编辑产品_${uniqueId()}`);
      await page.click('button:has-text("保存修改")');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });

  test('PM-005: 配置产品功能点', async ({ page }) => {
    const configBtn = page.locator('.ant-table button').filter({ hasText: '配置功能点' }).first();
    if (await configBtn.isVisible()) {
      await configBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
      await expect(page.locator('.ant-table')).toBeVisible();
    }
  });
});
