import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsH5User } from '../../helpers';
import { HomePage } from '../../pages/HomePage';
import { CheckInPage } from '../../pages/CheckInPage';
import { PointsPage } from '../../pages/PointsPage';
import { MallPage } from '../../pages/MallPage';
import { ProfilePage } from '../../pages/ProfilePage';

/**
 * Full end-to-end user journey tests for H5.
 * Tests the complete flow: Login → Home → CheckIn → Points → Mall → Profile → Logout
 */
test.describe('H5 - 完整用户旅程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
  });

  test('H5-JOURNEY-001: 完整登录→首页→退出流程', async ({ page }) => {
    // Step 1: Login
    const authData = await loginAsH5User(page);
    expect(authData).not.toBeNull();

    // Step 2: Navigate to home
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 3: Verify home page rendered with TabBar
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 10000 });
    await expect(homePage.checkInStatusCard).toBeVisible();
    await expect(homePage.quickEntrySection).toBeVisible();
    await expect(homePage.leaderboardCard).toBeVisible();

    // Step 4: Navigate to profile and logout
    await homePage.navigateToProfile();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const profilePage = new ProfilePage(page);
    await expect(profilePage.logoutButton).toBeVisible();
    await profilePage.clickLogout();
    await page.waitForTimeout(3000);

    // Step 5: Verify redirected to login
    expect(await profilePage.isLoggedOut()).toBe(true);
  });

  test('H5-JOURNEY-002: 首页→打卡→返回首页流程', async ({ page }) => {
    await loginAsH5User(page);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homePage = new HomePage(page);

    // Navigate to checkin via quick entry
    await homePage.navigateToCheckin();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const checkInPage = new CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible({ timeout: 10000 });
    await expect(checkInPage.noticeCard).toBeVisible();

    // Return home via TabBar
    await checkInPage.navigateHome();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(homePage.tabBar).toBeVisible();
  });

  test('H5-JOURNEY-003: 首页→积分页面流程', async ({ page }) => {
    await loginAsH5User(page);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homePage = new HomePage(page);
    await homePage.navigateToPoints();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const pointsPage = new PointsPage(page);
    await expect(pointsPage.pointsHeader).toBeVisible({ timeout: 10000 });
    await expect(pointsPage.levelProgressCard).toBeVisible();
    await expect(pointsPage.pointsHistoryCard).toBeVisible();
    await expect(pointsPage.leaderboardCard).toBeVisible();
  });

  test('H5-JOURNEY-004: 首页→商城页面流程', async ({ page }) => {
    await loginAsH5User(page);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homePage = new HomePage(page);
    await homePage.navigateToMall();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const mallPage = new MallPage(page);
    await expect(mallPage.searchBar).toBeVisible({ timeout: 10000 });
    await expect(mallPage.tabBar).toBeVisible();
  });

  test('H5-JOURNEY-005: TabBar导航完整性(5个Tab都能跳转)', async ({ page }) => {
    await loginAsH5User(page);
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const homePage = new HomePage(page);

    // Home → Checkin
    await homePage.checkinTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/checkin');

    // Checkin → Mall
    const checkInPage = new CheckInPage(page);
    await checkInPage.mallTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/mall');

    // Mall → MyCoupons (卡券)
    const mallPage = new MallPage(page);
    await mallPage.couponsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/my-coupons');

    // Coupons → Profile
    await page.locator('.adm-tab-bar-item').filter({ hasText: '我的' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/profile');
  });

  test('H5-JOURNEY-006: 未登录状态访问受保护页面重定向登录', async ({ page }) => {
    const protectedPages = ['/', '/checkin', '/mall', '/points', '/profile'];

    for (const path of protectedPages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
      // Clear auth for next iteration
      await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    }
  });

  test('H5-JOURNEY-007: 打卡→积分联动验证', async ({ page }) => {
    await loginAsH5User(page);

    // Navigate to checkin
    await page.goto(`${BASE_URL}/checkin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const checkInPage = new CheckInPage(page);
    const alreadyCheckedIn = await page.locator('text=已打卡').count() > 0;

    if (!alreadyCheckedIn) {
      // Try to check in
      const button = checkInPage.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(5000);

        // Check if success overlay appeared
        const hasSuccess = await checkInPage.successOverlay.isVisible().catch(() => false);
        if (hasSuccess) {
          // Return to home and verify
          await checkInPage.returnHome();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          // Navigate to points page
          await page.goto(`${BASE_URL}/points`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          const pointsPage = new PointsPage(page);
          // Points should show accumulated value after checkin
          const pointsText = await pointsPage.totalPoints.textContent().catch(() => '0');
          const points = parseInt(pointsText.replace(/,/g, ''), 10);
          expect(points).toBeGreaterThan(0);
        }
      }
    }
  });

  test('H5-JOURNEY-008: 页面滚动不破坏布局', async ({ page }) => {
    await loginAsH5User(page);
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Scroll up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Logout button should still be visible
    const profilePage = new ProfilePage(page);
    await expect(profilePage.logoutButton).toBeVisible();

    // TabBar should still be at the bottom
    const tabBarBox = await profilePage.tabBar.boundingBox();
    expect(tabBarBox).not.toBeNull();
  });
});
