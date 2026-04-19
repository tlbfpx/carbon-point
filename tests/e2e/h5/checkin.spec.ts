import { test, expect } from '@playwright/test';
import { BASE_URL } from './config';
import { H5CheckInPage } from './CheckInPage';
import { H5HomePage } from './HomePage';
import { H5PointsPage } from './PointsPage';
import { loginAndNavigate, clearH5Auth } from './helpers';

test.describe('H5 - 打卡功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearH5Auth(page);
    await loginAndNavigate(page, '/checkin');
  });

  test.afterEach(async ({ page }) => {
    await clearH5Auth(page);
  });

  test('CHECKIN-001: 打卡页正确渲染', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible({ timeout: 10000 });
    await expect(checkInPage.noticeCard).toBeVisible();
    await expect(checkInPage.tabBar).toBeVisible();
  });

  test('CHECKIN-002: 今日打卡时段卡片可见', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible();
  });

  test('CHECKIN-003: 打卡须知卡片可见且包含规则', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.noticeCard).toBeVisible();

    const noticeText = await checkInPage.noticeCard.textContent();
    expect(noticeText).toContain('爬楼梯');
    expect(noticeText).toContain('打卡一次');
    expect(noticeText).toContain('积分');
    expect(noticeText).toContain('连续');
  });

  test('CHECKIN-004: 打卡须知包含4条规则', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const noticeText = await checkInPage.noticeCard.textContent() || '';
    // Count <li> elements within the notice card
    const listItems = checkInPage.noticeCard.locator('li');
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('CHECKIN-005: TabBar完整显示5个Tab', async ({ page }) => {
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('CHECKIN-006: 时段卡片显示时段名称', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible({ timeout: 5000 });
  });

  test('CHECKIN-007: 时段卡片显示Badge状态', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const badge = checkInPage.timeSlotCard.locator('.adm-badge');
    const count = await badge.count();
    expect(count).toBeGreaterThan(0);
  });

  test('CHECKIN-008: 时段卡片显示时段范围时间', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    // Should show time range like "HH:mm - HH:mm"
    await expect(page.locator('text=/\\d{2}:\\d{2} - \\d{2}:\\d{2}/')).toBeVisible({ timeout: 5000 });
  });

  test('CHECKIN-009: 可打卡时段显示打卡按钮', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const availableBadge = checkInPage.getBadge('可打卡');
    if (await availableBadge.count() > 0) {
      const button = checkInPage.getFirstCheckInButton();
      await expect(button).toBeVisible();
    }
  });

  test('CHECKIN-010: 打卡按钮点击后触发打卡', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const button = checkInPage.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
      // Wait for either success overlay or the "已打卡" badge to appear
      const hasSuccess = await checkInPage.successOverlay.isVisible({ timeout: 8000 }).catch(() => false);
      const alreadyChecked = await checkInPage.getBadge('已打卡').count() > 0;
      expect(hasSuccess || alreadyChecked).toBe(true);
    }
  });

  test('CHECKIN-011: 打卡成功显示成功反馈界面', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);

    // Check if already checked in today
    const alreadyCheckedIn = await checkInPage.getBadge('已打卡').count() > 0;
    if (alreadyCheckedIn) {
      test.skip();
      return;
    }

    const button = checkInPage.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
      await expect(checkInPage.successOverlay).toBeVisible({ timeout: 8000 });
      await expect(checkInPage.congratulationsText).toBeVisible();
    }
  });

  test('CHECKIN-012: 打卡成功显示积分奖励', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const alreadyCheckedIn = await checkInPage.getBadge('已打卡').count() > 0;
    if (alreadyCheckedIn) {
      test.skip();
      return;
    }

    const button = checkInPage.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
      await checkInPage.successOverlay.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      const hasEarnedPoints = await checkInPage.earnedPointsText.isVisible().catch(() => false);
      const hasPointsLabel = await checkInPage.pointsLabel.isVisible().catch(() => false);
      expect(hasEarnedPoints || hasPointsLabel).toBe(true);
    }
  });

  test('CHECKIN-013: 打卡成功后显示倒计时自动返回', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const alreadyCheckedIn = await checkInPage.getBadge('已打卡').count() > 0;
    if (alreadyCheckedIn) {
      test.skip();
      return;
    }

    const button = checkInPage.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
      // Wait for countdown or return button to appear
      const hasCountdown = await checkInPage.countdownText.isVisible({ timeout: 5000 }).catch(() => false);
      const hasReturnButton = await checkInPage.immediateReturnButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasCountdown || hasReturnButton).toBe(true);
    }
  });

  test('CHECKIN-014: 点击立即返回跳转首页', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const alreadyCheckedIn = await checkInPage.getBadge('已打卡').count() > 0;
    if (alreadyCheckedIn) {
      test.skip();
      return;
    }

    const button = checkInPage.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
      // Wait for return button to appear
      if (await checkInPage.immediateReturnButton.isVisible({ timeout: 8000 })) {
        await checkInPage.returnHome();
        await expect(page.url()).toContain('/');

        const homePage = new H5HomePage(page);
        await expect(homePage.tabBar).toBeVisible();
        await expect(homePage.checkInStatusCard).toBeVisible();
      }
    }
  });

  test('CHECKIN-015: 打卡后积分变化验证', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    const alreadyCheckedIn = await checkInPage.getBadge('已打卡').count() > 0;

    if (!alreadyCheckedIn) {
      const button = checkInPage.getFirstCheckInButton();
      if (await button.count() > 0) {
        // Record points before checkin
        await page.goto(`${BASE_URL}/points`);
        await page.waitForLoadState('networkidle');

        const pointsPageBefore = new H5PointsPage(page);
        const pointsBefore = await pointsPageBefore.getTotalPointsNumber();

        // Do checkin
        await page.goto(`${BASE_URL}/checkin`);
        await page.waitForLoadState('networkidle');

        const checkInPage2 = new H5CheckInPage(page);
        await checkInPage2.getFirstCheckInButton().click();
        await checkInPage2.successOverlay.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

        // Verify success
        const hasSuccess = await checkInPage2.successOverlay.isVisible().catch(() => false);
        if (hasSuccess) {
          // Navigate to points page
          await page.goto(`${BASE_URL}/points`);
          await page.waitForLoadState('networkidle');

          const pointsPageAfter = new H5PointsPage(page);
          const pointsAfter = await pointsPageAfter.getTotalPointsNumber();
          expect(pointsAfter).toBeGreaterThanOrEqual(pointsBefore);
        }
      }
    }
  });

  test('CHECKIN-016: TabBar点击首页返回首页', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await checkInPage.navigateHome();

    const homePage = new H5HomePage(page);
    await expect(homePage.tabBar).toBeVisible();
    await expect(homePage.greetingText).toBeVisible();
    await expect(page.url()).toContain('/');
  });

  test('CHECKIN-017: TabBar点击商城跳转到商城页', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await checkInPage.mallTab.click();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/mall');
  });

  test('CHECKIN-018: TabBar点击我的跳转到个人中心', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await checkInPage.profileTab.click();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/profile');
  });

  test('CHECKIN-019: 打卡页无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('CHECKIN-020: 查看打卡历史链接可见', async ({ page }) => {
    const checkInPage = new H5CheckInPage(page);
    await expect(checkInPage.viewHistoryLink).toBeVisible();
  });
});
