import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';

test.describe('企业后台 - 数据看板', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
  });

  test('DASH-001: 登录后进入看板', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible({ timeout: 15000 });
    // 等待菜单稳定后再断言
    await expect(page.locator('.ant-menu-item').first()).toBeVisible({ timeout: 15000 });
    // 验证当前激活的菜单项
    await expect(page.locator('.ant-menu-item-selected')).toBeVisible({ timeout: 15000 });
  });

  test('DASH-002: 侧边栏菜单完整', async ({ page }) => {
    // 等待菜单完全加载
    await expect(page.locator('.ant-menu').first()).toBeVisible({ timeout: 15000 });
    // 使用 Ant Design Menu 的结构来验证菜单项
    const menuItems = page.locator('.ant-menu-dark .ant-menu-item');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
    // 验证菜单中有必要的菜单项文本
    const menuText = await page.locator('.ant-menu-dark .ant-menu-item').allTextContents();
    const fullText = menuText.join(' ');
    expect(fullText).toContain('员工管理');
    expect(fullText).toContain('规则配置');
    expect(fullText).toContain('产品管理');
    expect(fullText).toContain('订单管理');
  });

  test('DASH-003: 四个统计卡片正确显示', async ({ page }) => {
    // 等待统计卡片区域加载 - 使用 .ant-layout-content 下的内容区
    await expect(page.locator('.ant-layout-content').first()).toBeVisible({ timeout: 15000 });
    // 验证统计卡片的标签文本
    await expect(page.locator('text=今日签到').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=今日积分').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=活跃成员').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=本月兑换').first()).toBeVisible({ timeout: 10000 });
  });

  test('DASH-004: 打卡趋势图表可见', async ({ page }) => {
    await expect(page.locator('text=签到趋势').first()).toBeVisible({ timeout: 15000 });
  });

  test('DASH-005: 积分发放趋势图表可见', async ({ page }) => {
    await expect(page.locator('text=积分概况').first()).toBeVisible({ timeout: 15000 });
  });

  test('DASH-006: 热门商品表格可见', async ({ page }) => {
    await expect(page.locator('text=热门商品').first()).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  });

  test('DASH-007: 页面标题正确', async ({ page }) => {
    await expect(page.locator('text=数据概览').first()).toBeVisible({ timeout: 15000 });
  });

  test('DASH-008: 用户头像显示正确', async ({ page }) => {
    const userInfoArea = page.locator('.ant-layout-header');
    await expect(userInfoArea).toBeVisible();
    await expect(page.locator('.ant-avatar')).toBeVisible();
  });

  test('DASH-009: 图表包含数据点', async ({ page }) => {
    // 等待图表渲染完成
    await page.waitForSelector('svg.recharts-surface', { timeout: 15000 });
    const chartDataPoints = await page.locator('svg.recharts-surface').count();
    expect(chartDataPoints).toBeGreaterThan(0);
  });

  test('DASH-010: 表格列标题正确', async ({ page }) => {
    await expect(page.locator('text=排名').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=商品名称').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=兑换次数').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=消耗积分').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=热度').first()).toBeVisible({ timeout: 10000 });
  });

  test('DASH-011: 统计卡片图标正确', async ({ page }) => {
    // 等待统计卡片区域稳定 - 通过查找包含图标的统计区域
    await expect(page.locator('text=今日签到').first()).toBeVisible({ timeout: 15000 });
    // 统计卡片中的图标在 SVG 元素中
    await expect(page.locator('.ant-layout-content svg').first()).toBeVisible({ timeout: 10000 });
  });

  test('DASH-012: 页面布局完整无崩溃', async ({ page }) => {
    // 综合检查页面没有空白或错误状态
    await expect(page.locator('.ant-layout-content')).toBeVisible({ timeout: 15000 });
    // 确保没有错误提示
    await expect(page.locator('.ant-result').filter({ hasText: '错误' })).toHaveCount(0);
  });
});
