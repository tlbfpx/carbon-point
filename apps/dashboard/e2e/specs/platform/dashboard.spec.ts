import { test, expect } from '@playwright/test';
import { PlatformDashboardPage } from '../../pages/platform/PlatformDashboardPage';

test.describe('平台后台 - 平台看板', () => {
  let dashboardPage: PlatformDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new PlatformDashboardPage(page);
    await dashboardPage.goto();
  });

  test('PD-001: 平台看板加载', async () => {
    await expect(dashboardPage.page.locator('h2').filter({ hasText: '平台看板' })).toBeVisible();
  });

  test('PD-002: 企业统计卡片显示', async () => {
    const count = await dashboardPage.getEnterpriseCount();
    expect(parseInt(count)).toBeGreaterThanOrEqual(0);
  });

  test('PD-003: 平台数据图表可见', async () => {
    await dashboardPage.expectChartsVisible();
  });
});
