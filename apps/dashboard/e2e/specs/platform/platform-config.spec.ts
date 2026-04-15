import { test, expect } from '@playwright/test';
import { PlatformConfigPage } from '../../pages/platform/PlatformConfigPage';

test.describe('平台后台 - 平台配置', () => {
  let configPage: PlatformConfigPage;

  test.beforeEach(async ({ page }) => {
    configPage = new PlatformConfigPage(page);
    await configPage.goto();
  });

  test('PC-001: 配置页面加载', async () => {
    await expect(configPage.form).toBeVisible();
  });

  test('PC-002: 配置保存功能', async () => {
    await configPage.save();
    await configPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });
});
