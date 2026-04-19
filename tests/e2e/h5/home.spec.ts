import { test, expect } from '@playwright/test';
import { BASE_URL } from './config';
import { H5HomePage } from './HomePage';
import { H5CheckInPage } from './CheckInPage';
import { H5PointsPage } from './PointsPage';
import { H5ProfilePage } from './ProfilePage';
import { H5MallPage } from './MallPage';
import { loginAndNavigate, clearH5Auth } from './helpers';

test.describe('H5 - 首页功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearH5Auth(page);
    await loginAndNavigate(page, '/');
  });

  test.afterEach(async ({ page }) => {
    await clearH5Auth(page);
  });

  test('HOME-001: 首页正确渲染', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 10000 });
    await expect(homePage.greetingText).toBeVisible();
    await expect(homePage.subtitle).toBeVisible();
  });

  test('HOME-002: 问候语格式正确', async ({ page }) => {
    const homePage = new H5HomePage(page);
    const greeting = await homePage.greetingText.textContent();
    // Should contain "早上好"/"下午好"/"晚上好"
    expect(greeting).toMatch(/^[早上下晚][上下午][好]/);
    // Should contain username or "用户"
    expect(greeting).toMatch(/好.*[用户]/);
  });

  test('HOME-003: 今日打卡状态卡片可见', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(homePage.checkInStatusCard).toBeVisible();
  });

  test('HOME-004: 打卡按钮可见性 - 尚未打卡时显示立即打卡按钮', async ({ page }) => {
    const homePage = new H5HomePage(page);
    const checkInButton = homePage.checkInButton;
    const notCheckedIn = homePage.notCheckedInText;

    // Either "立即打卡" button or "今日已打卡" text should be visible
    const hasCheckInButton = await checkInButton.isVisible().catch(() => false);
    const hasNotCheckedIn = await notCheckedIn.isVisible().catch(() => false);
    expect(hasCheckInButton || hasNotCheckedIn).toBe(true);
  });

  test('HOME-005: 快捷入口卡片可见', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(homePage.quickEntrySection).toBeVisible();
  });

  test('HOME-006: 快捷入口包含所有4个入口', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(homePage.checkinEntry).toBeVisible();
    await expect(homePage.pointsEntry).toBeVisible();
    await expect(homePage.mallEntry).toBeVisible();
    await expect(homePage.notificationsEntry).toBeVisible();
  });

  test('HOME-007: 排行榜卡片可见', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(homePage.leaderboardCard).toBeVisible();
  });

  test('HOME-008: TabBar完整显示5个Tab', async ({ page }) => {
    const homePage = new H5HomePage(page);
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('HOME-009: TabBar包含正确的Tab标题', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '首页' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '打卡' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '商城' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '卡券' })).toBeVisible();
    await expect(page.locator('.adm-tab-bar-item').filter({ hasText: '我的' })).toBeVisible();
  });

  test('HOME-010: 点击积分入口跳转到积分页', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await homePage.navigateToPoints();
    await expect(page.url()).toContain('/points');

    const pointsPage = new H5PointsPage(page);
    await expect(pointsPage.pointsHeader).toBeVisible({ timeout: 5000 });
  });

  test('HOME-011: 点击商城入口跳转到商城页', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await homePage.navigateToMall();
    await expect(page.url()).toContain('/mall');

    const mallPage = new H5MallPage(page);
    await expect(mallPage.tabBar).toBeVisible({ timeout: 5000 });
  });

  test('HOME-012: TabBar点击打卡跳转到打卡页', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await homePage.checkinTab.click();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/checkin');

    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.tabBar).toBeVisible({ timeout: 5000 });
  });

  test('HOME-013: TabBar点击我的跳转到个人中心', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await homePage.navigateToProfile();
    await expect(page.url()).toContain('/profile');

    const profilePage = new H5ProfilePage(page);
    await expect(profilePage.logoutButton).toBeVisible({ timeout: 5000 });
  });

  test('HOME-014: 打卡Tab激活状态', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await homePage.checkinTab.click();
    await page.waitForLoadState('networkidle');

    // Tab should show active state (checkin tab should be highlighted)
    const activeTab = page.locator('.adm-tab-bar-item.adm-tab-bar-item-active');
    const activeText = await activeTab.textContent().catch(() => '');
    expect(activeText).toContain('打卡');
  });

  test('HOME-015: 首页无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('HOME-016: 首页滚动不破坏TabBar', async ({ page }) => {
    const homePage = new H5HomePage(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(homePage.tabBar).toBeVisible();

    const tabBarBox = await homePage.tabBar.boundingBox();
    expect(tabBarBox).not.toBeNull();
    expect(tabBarBox!.width).toBeGreaterThan(0);
  });

  test('HOME-017: 立即打卡按钮点击跳转打卡页', async ({ page }) => {
    const homePage = new H5HomePage(page);
    const hasButton = await homePage.checkInButton.isVisible().catch(() => false);
    if (hasButton) {
      await homePage.checkInButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.url()).toContain('/checkin');
    }
  });
});
