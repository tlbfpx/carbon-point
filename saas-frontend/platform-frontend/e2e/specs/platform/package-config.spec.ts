import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin, uniqueId } from '../../helpers';

test.describe('平台后台 - 套餐配置', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/packages`);
    await page.waitForLoadState('networkidle');
  });

  test('PC-001: 套餐管理页面可访问', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('套餐管理');
    await expect(page.locator('.ant-table')).toBeVisible();
  });

  test('PC-002: 创建套餐', async ({ page }) => {
    const packageName = `测试套餐_${uniqueId()}`;
    const packageCode = `TEST_PKG_${Date.now()}`;

    await page.click('button:has-text("创建套餐")');
    await expect(page.locator('.ant-modal')).toBeVisible();

    await page.fill('input[placeholder*="套餐编码"]', packageCode);
    await page.fill('input[placeholder*="套餐名称"]', packageName);

    await page.click('button:has-text("确认创建")');
    await expect(page.locator('.ant-message')).toContainText('成功');
  });

  test('PC-003: 配置套餐产品', async ({ page }) => {
    const configBtn = page.locator('.ant-table button').filter({ hasText: '配置产品' }).first();
    if (await configBtn.isVisible()) {
      await configBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();

      // Select a product
      const productCheckbox = page.locator('.ant-modal .ant-checkbox').first();
      if (await productCheckbox.isVisible()) {
        await productCheckbox.click();
      }

      // Save
      await page.click('.ant-modal button:has-text("确定")');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });

  test('PC-004: 配置产品功能点', async ({ page }) => {
    const configBtn = page.locator('.ant-table button').filter({ hasText: '配置产品' }).first();
    if (await configBtn.isVisible()) {
      await configBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();

      // Select a product first
      const productCheckbox = page.locator('.ant-modal .ant-checkbox').first();
      if (await productCheckbox.isVisible()) {
        await productCheckbox.click();
        // Wait for UI to update
      }

      // Expand feature configuration panel
      const panelHeader = page.locator('.ant-collapse-item-header').filter({ hasText: '功能点配置' }).first();
      if (await panelHeader.isVisible()) {
        await panelHeader.click();
        // Wait for UI to update

        // Check if feature list is rendered
        const featureItem = page.locator('.ant-modal .ant-checkbox').nth(1);
        if (await featureItem.isVisible({ timeout: 2000 })) {
          // Toggle a feature
          await featureItem.click();
          // Save features
          const saveBtn = page.locator('.ant-modal button').filter({ hasText: '保存该产品功能点' });
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await expect(page.locator('.ant-message')).toContainText('成功');
          }
        }
      }
    }
  });

  test('PC-005: 编辑套餐', async ({ page }) => {
    const editBtn = page.locator('.ant-table button').filter({ hasText: '编辑' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.ant-modal')).toBeVisible();
      await page.fill('input[placeholder*="套餐名称"]', `编辑套餐_${uniqueId()}`);
      await page.click('button:has-text("保存修改")');
      await expect(page.locator('.ant-message')).toContainText('成功');
    }
  });
});
