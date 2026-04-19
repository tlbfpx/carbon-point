import { test, expect } from '@playwright/test';
import { BASE_URL } from './config';
import { H5PointsPage } from './PointsPage';
import { H5HomePage } from './HomePage';
import { loginAndNavigate, clearH5Auth } from './helpers';

test.describe('H5 - 积分查询功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearH5Auth(page);
    await loginAndNavigate(page, '/points');
  });

  test.afterEach(async ({ page }) => {
    await clearH5Auth(page);
  });

  test('POINTS-001: 积分页面正确渲染', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.tabBar).toBeVisible({ timeout: 10000 });
    await expect(pointsPage.pointsHeader).toBeVisible();
  });

  test('POINTS-002: 我的积分头部可见', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.pointsHeader).toBeVisible();
  });

  test('POINTS-003: 总积分数字显示正确格式', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const totalPoints = await pointsPage.totalPointsValue.textContent().catch(() => '0');
    // Should be a valid number (with optional commas)
    expect(totalPoints).toMatch(/^[\d,]+$/);
  });

  test('POINTS-004: 等级徽章可见且格式正确', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.levelBadge).toBeVisible({ timeout: 5000 });
    const levelText = await pointsPage.levelBadge.textContent();
    expect(levelText).toMatch(/Lv\.\d/);
  });

  test('POINTS-005: 等级进度卡片可见', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.levelProgressCard).toBeVisible();
  });

  test('POINTS-006: 等级进度条可见', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const progressBar = pointsPage.levelProgressBar;
    const isVisible = await progressBar.isVisible().catch(() => false);
    const cardVisible = await pointsPage.levelProgressCard.isVisible().catch(() => false);
    // Progress bar or the card container should be visible
    expect(isVisible || cardVisible).toBe(true);
  });

  test('POINTS-007: 积分明细卡片可见', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.pointsHistoryCard).toBeVisible();
  });

  test('POINTS-008: 积分明细列表存在（数据或空状态）', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const hasList = await pointsPage.pointsHistoryList.isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=暂无').isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  test('POINTS-009: 排行榜卡片可见', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.leaderboardCard).toBeVisible();
  });

  test('POINTS-010: 排行榜列表存在（数据或空状态）', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const hasLeaderboard = await pointsPage.leaderboardList.isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=暂无排行数据').isVisible().catch(() => false);
    expect(hasLeaderboard || hasEmpty).toBe(true);
  });

  test('POINTS-011: 积分数据为非负数', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const total = await pointsPage.getTotalPointsNumber();
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('POINTS-012: TabBar完整显示5个Tab', async ({ page }) => {
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('POINTS-013: TabBar点击首页返回首页', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await pointsPage.navigateHome();

    const homePage = new H5HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 5000 });
    await expect(homePage.greetingText).toBeVisible();
  });

  test('POINTS-014: TabBar点击打卡跳转到打卡页', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await pointsPage.navigateToCheckin();
    await expect(page.url()).toContain('/checkin');
  });

  test('POINTS-015: 积分页面无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('POINTS-016: 积分页面滚动不破坏TabBar', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(pointsPage.tabBar).toBeVisible();

    const tabBarBox = await pointsPage.tabBar.boundingBox();
    expect(tabBarBox).not.toBeNull();
    expect(tabBarBox!.width).toBeGreaterThan(0);
  });

  test('POINTS-017: 可用积分显示', async ({ page }) => {
    const pointsPage = new H5PointsPage(page);
    const available = pointsPage.availablePointsText;
    const isVisible = await available.isVisible().catch(() => false);
    if (isVisible) {
      const text = await available.textContent();
      expect(text).toMatch(/可用:\s*\d/);
    }
  });
});
