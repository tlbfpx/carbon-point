import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/enterprise/DashboardPage';

test.describe('企业后台 - 数据看板', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('DASH-001: 看板页面加载', async () => {
    await expect(dashboardPage.page.locator('h2').filter({ hasText: '数据看板' })).toBeVisible();
  });

  test('DASH-002: 统计卡片数据正确显示', async () => {
    const stats = await dashboardPage.getStatCardValues();
    expect(stats).toHaveProperty('今日打卡人数');
    expect(stats).toHaveProperty('今日积分发放');
    expect(stats).toHaveProperty('活跃用户');
    expect(stats).toHaveProperty('本月兑换量');
  });

  test('DASH-003: 打卡趋势图表正确渲染', async () => {
    await dashboardPage.expectChartsVisible();
    await dashboardPage.expectChartsRendered();
  });

  test('DASH-004: 积分趋势图表正确渲染', async () => {
    await dashboardPage.expectChartsVisible();
    await dashboardPage.expectChartsRendered();
  });
});
