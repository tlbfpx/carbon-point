import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

test.describe('平台后台 - 平台看板', () => {
  test('PD-001: 平台看板页面可访问', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('text=平台看板')).toBeVisible();
  });

  test('PD-002: 侧边栏菜单完整', async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await expect(page.locator('text=企业管理')).toBeVisible();
    await expect(page.locator('text=系统管理')).toBeVisible();
    await expect(page.locator('text=平台配置')).toBeVisible();
  });
});
