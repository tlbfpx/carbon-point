import { test, expect } from '@playwright/test';
import { ReportsPage } from '../../pages/enterprise/ReportsPage';

test.describe('企业后台 - 数据报表', () => {
  let reportsPage: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reportsPage = new ReportsPage(page);
    await reportsPage.goto();
  });

  test('RPT-001: 报表页面加载', async () => {
    await expect(reportsPage.page.locator('h2').filter({ hasText: '数据报表' })).toBeVisible();
  });

  test('RPT-002: 导出按钮可见', async () => {
    await expect(reportsPage.exportButtons.first()).toBeVisible();
  });

  test('RPT-003: 趋势图正确渲染', async () => {
    await reportsPage.expectChartsVisible();
  });
});
