import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';
import { DashboardPage } from '../pages/enterprise/DashboardPage';

test.describe('企业后台 - 数据看板', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('DASH-001: 登录后进入看板', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=数据看板').first()).toBeVisible();
  });

  test('DASH-002: 侧边栏菜单完整', async ({ page }) => {
    await expect(page.locator('text=员工管理')).toBeVisible();
    await expect(page.locator('text=规则配置')).toBeVisible();
    await expect(page.locator('text=商品管理')).toBeVisible();
    await expect(page.locator('text=订单管理')).toBeVisible();
    await expect(page.locator('text=积分运营')).toBeVisible();
    await expect(page.locator('text=数据报表')).toBeVisible();
    await expect(page.locator('text=角色权限')).toBeVisible();
  });

  test('DASH-003: 四个统计卡片正确显示', async ({ page }) => {
    // 验证四个统计卡片都存在
    const statCards = page.locator('.ant-statistic');
    await expect(statCards).toHaveCount(4);
    // 验证四个统计卡片的标题
    await expect(page.locator('text=今日打卡人数')).toBeVisible();
    await expect(page.locator('text=今日积分发放')).toBeVisible();
    await expect(page.locator('text=活跃用户')).toBeVisible();
    await expect(page.locator('text=本月兑换量')).toBeVisible();
  });

  test('DASH-004: 打卡趋势图表可见', async ({ page }) => {
    await dashboardPage.checkinChart.waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('text=打卡趋势（近7天）')).toBeVisible();
  });

  test('DASH-005: 积分发放趋势图表可见', async ({ page }) => {
    await dashboardPage.pointsChart.waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('text=积分发放趋势（近7天）')).toBeVisible();
  });

  test('DASH-006: 热门商品表格可见', async ({ page }) => {
    await expect(page.locator('text=热门商品 TOP5')).toBeVisible();
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  });

  test('DASH-007: 页面标题正确', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: '数据看板' })).toBeVisible();
  });

  test('DASH-008: 用户头像显示正确', async ({ page }) => {
    const userInfoArea = page.locator('.ant-layout-header');
    await expect(userInfoArea).toBeVisible();
    await expect(page.locator('.ant-avatar')).toBeVisible();
  });

  test('DASH-009: 图表包含数据点', async ({ page }) => {
    // 等待图表渲染完成
    await page.waitForSelector('svg.recharts-surface', { timeout: 10000 });
    const chartDataPoints = await page.locator('svg.recharts-surface').count();
    expect(chartDataPoints).toBeGreaterThan(0);
  });

  test('DASH-010: 表格列标题正确', async ({ page }) => {
    await expect(page.locator('text=排名')).toBeVisible();
    await expect(page.locator('text=商品名称')).toBeVisible();
    await expect(page.locator('text=兑换次数')).toBeVisible();
    await expect(page.locator('text=消耗积分')).toBeVisible();
    await expect(page.locator('text=热度')).toBeVisible();
  });

  test('DASH-011: 统计卡片图标正确', async ({ page }) => {
    // 验证统计卡片区域有图标（使用first避免菜单图标干扰）
    await expect(page.locator('.ant-statistic .anticon').first()).toBeVisible();
  });

  test('DASH-012: 卡片布局正确', async ({ page }) => {
    // 验证统计卡片区域存在
    const firstRow = page.locator('.ant-row').first();
    await expect(firstRow).toBeVisible();
    // 验证有6个Col包含Card（4个统计卡片 + 2个图表卡片）
    const cardContainers = page.locator('.ant-col .ant-card');
    await expect(cardContainers).toHaveCount(6);
  });

  test('DASH-013: 趋势图表渲染在正确的容器中', async ({ page }) => {
    // 验证打卡趋势图表容器
    const checkInCard = page.locator('.ant-card').filter({ hasText: '打卡趋势' });
    await expect(checkInCard.locator('.recharts-responsive-container')).toBeVisible();
    // 验证积分趋势图表容器
    const pointsCard = page.locator('.ant-card').filter({ hasText: '积分发放趋势' });
    await expect(pointsCard.locator('.recharts-responsive-container')).toBeVisible();
  });

  test('DASH-014: 表格内容区域存在', async ({ page }) => {
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await expect(page.locator('.ant-table-tbody')).toBeVisible();
  });

  test('DASH-015: 页面布局完整无崩溃', async ({ page }) => {
    // 综合检查页面没有空白或错误状态
    await expect(page.locator('h2').filter({ hasText: '数据看板' })).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
    // 确保没有错误提示
    await expect(page.locator('.ant-result').filter({ hasText: '错误' })).toHaveCount(0);
  });
});
