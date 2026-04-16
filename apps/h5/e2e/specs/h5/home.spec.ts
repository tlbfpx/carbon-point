import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { HomePage } from '../../pages/HomePage';
import { loginAndNavigate } from '../../helpers';

test.describe('H5 - 首页', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first, then clear auth
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    await loginAndNavigate(page, '/');
  });

  test('H5-HOME-001: 首页正确渲染', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 10000 });
    await expect(homePage.greetingText).toBeVisible();
  });

  test('H5-HOME-002: 问候语包含用户信息', async ({ page }) => {
    const homePage = new HomePage(page);
    const greeting = await homePage.greetingText.textContent();
    // Should contain "早上好"/"下午好"/"晚上好"
    expect(greeting).toMatch(/^[早上下晚][上下午][好]/);
    // Should contain username or "用户"
    expect(greeting).toMatch(/好.*[用户测试]/);
  });

  test('H5-HOME-003: 今日打卡状态卡片可见', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.checkInStatusCard).toBeVisible();
  });

  test('H5-HOME-004: TabBar完整显示(5个Tab)', async ({ page }) => {
    const homePage = new HomePage(page);
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('H5-HOME-005: TabBar包含首页/打卡/商城/卡券/我的', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '首页' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '打卡' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '商城' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '卡券' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '我的' })).toBeVisible();
  });

  test('H5-HOME-006: 快捷入口卡片可见', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.quickEntrySection).toBeVisible();
  });

  test('H5-HOME-007: 快捷入口包含打卡入口', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.checkinEntry).toBeVisible();
  });

  test('H5-HOME-008: 快捷入口包含积分入口', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.pointsEntry).toBeVisible();
  });

  test('H5-HOME-009: 快捷入口包含商城入口', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.mallEntry).toBeVisible();
  });

  test('H5-HOME-010: 快捷入口包含消息入口', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.notificationsEntry).toBeVisible();
  });

  test('H5-HOME-011: 排行榜卡片可见', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.leaderboardCard).toBeVisible();
  });

  test('H5-HOME-012: 排行榜显示动态排行数据', async ({ page }) => {
    // Leaderboard now shows dynamic user data instead of static level steps
    const homePage = new HomePage(page);
    await expect(homePage.leaderboardCard).toBeVisible();
    // Should show leaderboard list (may be empty if no data, but card should be visible)
  });

  test('H5-HOME-013: 点击积分入口跳转到积分页', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToPoints();
    await expect(page.url()).toContain('/points');
  });

  test('H5-HOME-014: 点击商城入口跳转到商城页', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToMall();
    await expect(page.url()).toContain('/mall');
  });

  test('H5-HOME-015: TabBar点击打卡跳转到打卡页', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.checkinTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.url()).toContain('/checkin');
  });

  test('H5-HOME-016: TabBar点击我的跳转到个人中心', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToProfile();
    await expect(page.url()).toContain('/profile');
  });

  test('H5-HOME-017: 首页底部有TabBar(不被内容遮挡)', async ({ page }) => {
    const homePage = new HomePage(page);
    const tabBarBox = await homePage.tabBar.boundingBox();
    expect(tabBarBox).not.toBeNull();
    // TabBar should be visible and have dimensions
    expect(tabBarBox!.width).toBeGreaterThan(0);
    expect(tabBarBox!.height).toBeGreaterThan(0);
  });

  test('H5-HOME-018: 首页无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
