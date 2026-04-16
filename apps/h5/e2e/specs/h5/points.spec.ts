import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAndNavigate } from '../../helpers';
import { PointsPage } from '../../pages/PointsPage';
import { HomePage } from '../../pages/HomePage';

test.describe('H5 - 积分页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    await loginAndNavigate(page, '/points');
  });

  test('H5-POINTS-001: 积分页正确渲染', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.tabBar).toBeVisible({ timeout: 10000 });
  });

  test('H5-POINTS-002: 我的积分头部可见', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.pointsHeader).toBeVisible();
  });

  test('H5-POINTS-003: 等级徽章可见', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.levelBadge).toBeVisible({ timeout: 5000 });
  });

  test('H5-POINTS-004: 等级进度卡片可见', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.levelProgressCard).toBeVisible();
  });

  test('H5-POINTS-005: 积分明细卡片可见', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.pointsHistoryCard).toBeVisible();
  });

  test('H5-POINTS-006: 排行榜卡片可见', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await expect(pointsPage.leaderboardCard).toBeVisible();
  });

  test('H5-POINTS-007: 积分明细列表区域存在', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    const hasList = await pointsPage.pointsHistoryList.isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=暂无').isVisible().catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  test('H5-POINTS-008: 排行榜列表区域存在', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    // Should show leaderboard list or empty state
    const hasLeaderboard = await pointsPage.leaderboardList.isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=暂无排行数据').isVisible().catch(() => false);
    expect(hasLeaderboard || hasEmpty).toBe(true);
  });

  test('H5-POINTS-009: TabBar点击首页返回首页', async ({ page }) => {
    const pointsPage = new PointsPage(page);
    await pointsPage.navigateHome();
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 5000 });
  });

  test('H5-POINTS-010: 无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
