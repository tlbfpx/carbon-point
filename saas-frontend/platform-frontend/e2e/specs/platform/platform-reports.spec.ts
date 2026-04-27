import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsPlatformAdmin } from '../../helpers';

test.describe('平台后台 - 平台报表 (15 tests)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsPlatformAdmin(page, BASE_URL);
    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('PR-001: 平台报表页面可访问', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('PR-002: 页面标题显示“平台报表”', async ({ page }) => {
    const heading = page.locator('h2').filter({ hasText: '平台报表' });
    await expect(heading).toBeVisible();
  });

  test('PR-003: 页面副标题说明可见', async ({ page }) => {
    await expect(page.locator('text=查看平台整体运营数据和趋势分析')).toBeVisible();
  });

  test('PR-004: 日期范围选择器可见', async ({ page }) => {
    await expect(page.locator('.ant-picker-range')).toBeVisible();
  });

  test('PR-005: 导出报表按钮可见', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: '导出报表' });
    await expect(exportBtn).toBeVisible();
  });

  test('PR-006: 统计卡片可见（至少3个）', async ({ page }) => {
    const statCards = page.locator('.ant-statistic');
    await statCards.first().waitFor({ timeout: 10000 });
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('PR-007: 统计卡片显示“企业总数”', async ({ page }) => {
    const enterpriseCard = page.locator('.ant-statistic').filter({ hasText: '企业总数' });
    await expect(enterpriseCard).toBeVisible();
  });

  test('PR-008: 统计卡片显示“总用户数”', async ({ page }) => {
    const userCard = page.locator('.ant-statistic').filter({ hasText: '总用户数' });
    await expect(userCard).toBeVisible();
  });

  test('PR-009: 统计卡片显示“总积分发放”', async ({ page }) => {
    const pointsCard = page.locator('.ant-statistic').filter({ hasText: '总积分发放' });
    await expect(pointsCard).toBeVisible();
  });

  test('PR-010: 统计卡片显示“总兑换量”', async ({ page }) => {
    const exchangeCard = page.locator('.ant-statistic').filter({ hasText: '总兑换量' });
    await expect(exchangeCard).toBeVisible();
  });

  test('PR-011: 运营趋势图可见', async ({ page }) => {
    const chartCard = page.locator('.ant-card').filter({ hasText: '运营趋势' });
    await expect(chartCard).toBeVisible();
  });

  test('PR-012: 运营趋势图包含图表组件', async ({ page }) => {
    const chartCard = page.locator('.ant-card').filter({ hasText: '运营趋势' });
    await expect(chartCard.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 });
  });

  test('PR-013: 企业排行榜表格可见', async ({ page }) => {
    const tableCard = page.locator('.ant-card').filter({ hasText: '企业排行榜' });
    await expect(tableCard).toBeVisible();
  });

  test('PR-014: 企业排行榜表格组件可见', async ({ page }) => {
    const tableCard = page.locator('.ant-card').filter({ hasText: '企业排行榜' });
    await expect(tableCard.locator('.ant-table')).toBeVisible();
  });

  test('PR-015: 侧边栏菜单包含“平台报表”', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toContainText('平台报表');
  });
});
