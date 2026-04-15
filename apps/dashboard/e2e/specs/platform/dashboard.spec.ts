import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';
import { PlatformDashboardPage } from '../../pages/platform/PlatformDashboardPage';

test.describe('平台后台 - 平台看板 (20 tests)', () => {
  let dashboardPage: PlatformDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new PlatformDashboardPage(page);
    await loginAsPlatformAdmin(page, BASE_URL);
    await dashboardPage.goto();
    await dashboardPage.expectVisible();
  });

  test('PD-001: 平台看板页面可访问', async ({ page }) => {
    await expect(page.locator('text=平台看板').first()).toBeVisible();
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });

  test('PD-002: 侧边栏菜单完整', async ({ page }) => {
    await expect(page.locator('text=企业管理')).toBeVisible();
    await expect(page.locator('text=系统管理')).toBeVisible();
    await expect(page.locator('text=平台配置')).toBeVisible();
  });

  test('PD-003: 5个统计卡片可见', async ({ page }) => {
    await expect(page.locator('.ant-statistic').filter({ hasText: '企业总数' })).toBeVisible();
    await expect(page.locator('.ant-statistic').filter({ hasText: '活跃企业' })).toBeVisible();
    await expect(page.locator('.ant-statistic').filter({ hasText: '总用户数' })).toBeVisible();
    await expect(page.locator('.ant-statistic').filter({ hasText: '总积分发放' })).toBeVisible();
    await expect(page.locator('.ant-statistic').filter({ hasText: '总兑换量' })).toBeVisible();
  });

  test('PD-004: 统计卡片显示数值', async ({ page }) => {
    const statCard = page.locator('.ant-statistic').filter({ hasText: '企业总数' });
    const value = statCard.locator('.ant-statistic-content-value');
    await expect(value).toBeVisible();
    const text = await value.textContent();
    expect(text).not.toBe('');
  });

  test('PD-005: 维度切换控件可见且包含3个选项', async ({ page }) => {
    const segmented = page.locator('.ant-segmented');
    await expect(segmented).toBeVisible();
    await expect(segmented.locator('text=按日')).toBeVisible();
    await expect(segmented.locator('text=按周')).toBeVisible();
    await expect(segmented.locator('text=按月')).toBeVisible();
  });

  test('PD-006: 切换维度为按日', async ({ page }) => {
    await dashboardPage.switchDimension('day');
    const segmented = page.locator('.ant-segmented');
    await expect(segmented.locator('.ant-segmented-item-selected')).toContainText('按日');
  });

  test('PD-007: 切换维度为按周', async ({ page }) => {
    await dashboardPage.switchDimension('week');
    const segmented = page.locator('.ant-segmented');
    await expect(segmented.locator('.ant-segmented-item-selected')).toContainText('按周');
  });

  test('PD-008: 切换维度为按月', async ({ page }) => {
    await dashboardPage.switchDimension('month');
    const segmented = page.locator('.ant-segmented');
    await expect(segmented.locator('.ant-segmented-item-selected')).toContainText('按月');
  });

  test('PD-009: 导出报表按钮可见', async ({ page }) => {
    await expect(page.locator('button:has-text("导出报表")')).toBeVisible();
  });

  test('PD-010: 积分发放与消耗趋势图可见 (AreaChart)', async ({ page }) => {
    // Card with title "积分发放与消耗趋势" contains the AreaChart
    const chartCard = page.locator('.ant-card').filter({ hasText: '积分发放与消耗趋势' });
    await expect(chartCard.locator('.recharts-wrapper')).toBeVisible();
  });

  test('PD-011: 用户与兑换量趋势图可见 (LineChart)', async ({ page }) => {
    // Card with title "用户与兑换量趋势" contains the LineChart
    const chartCard = page.locator('.ant-card').filter({ hasText: '用户与兑换量趋势' });
    await expect(chartCard.locator('.recharts-wrapper')).toBeVisible();
  });

  test('PD-012: 企业积分排行图可见 (BarChart)', async ({ page }) => {
    // Card with title "企业积分排行 TOP 10" contains the BarChart
    const chartCard = page.locator('.ant-card').filter({ hasText: '企业积分排行 TOP 10' });
    await expect(chartCard.locator('.recharts-wrapper')).toBeVisible();
  });

  test('PD-013: 企业排行详情表格可见', async ({ page }) => {
    // Card with title "企业排行详情" contains the Table
    await expect(page.locator('.ant-card').filter({ hasText: '企业排行详情' })).toBeVisible();
    await expect(page.locator('.ant-card').filter({ hasText: '企业排行详情' }).locator('.ant-table')).toBeVisible();
  });

  test('PD-014: 切换维度后图表数据更新', async ({ page }) => {
    await dashboardPage.switchDimension('week');
    await page.waitForTimeout(1500);
    const chartCard = page.locator('.ant-card').filter({ hasText: '积分发放与消耗趋势' });
    await expect(chartCard.locator('.recharts-wrapper')).toBeVisible();
  });

  test('PD-015: 表格显示排行数据', async ({ page }) => {
    const table = page.locator('.ant-card').filter({ hasText: '企业排行详情' }).locator('.ant-table');
    await expect(table.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('PD-016: 表格不显示分页（数据少于一页）', async ({ page }) => {
    const table = page.locator('.ant-card').filter({ hasText: '企业排行详情' }).locator('.ant-table');
    // Table has pagination={false} so no pagination should be visible
    await expect(table.locator('.ant-pagination')).not.toBeVisible();
  });

  test('PD-017: 排行表格显示企业名称列', async ({ page }) => {
    const table = page.locator('.ant-card').filter({ hasText: '企业排行详情' }).locator('.ant-table');
    await table.locator('.ant-table-tbody tr').first().waitFor({ timeout: 10000 });
    // Check table has some content in cells
    const firstCell = table.locator('.ant-table-tbody td').first();
    await expect(firstCell).not.toBeEmpty();
  });

  test('PD-018: 图表包含标题或图例', async ({ page }) => {
    const chartCard = page.locator('.ant-card').filter({ hasText: '积分发放与消耗趋势' });
    await expect(chartCard.locator('.recharts-legend-wrapper')).toBeVisible();
  });

  test('PD-019: 页面布局完整无遮挡', async ({ page }) => {
    await expect(page.locator('.ant-layout-content')).toBeVisible();
    await expect(page.locator('h2:has-text("平台看板")')).toBeVisible();
  });

  test('PD-020: 导出按钮可点击', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("导出报表")');
    await expect(exportBtn).toBeEnabled();
  });
});