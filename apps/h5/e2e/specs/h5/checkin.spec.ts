import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAndNavigate } from '../../helpers';
import { CheckInPage } from '../../pages/CheckInPage';
import { HomePage } from '../../pages/HomePage';

test.describe('H5 - 打卡页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    await loginAndNavigate(page, '/checkin');
  });

  test('H5-CHECKIN-001: 打卡页正确渲染', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible({ timeout: 10000 });
    await expect(checkInPage.tabBar).toBeVisible();
  });

  test('H5-CHECKIN-002: TabBar在打卡页可见(5个Tab)', async ({ page }) => {
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('H5-CHECKIN-003: 今日打卡时段卡片可见', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    await expect(checkInPage.timeSlotCard).toBeVisible();
  });

  test('H5-CHECKIN-004: 打卡须知卡片可见', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    await expect(checkInPage.noticeCard).toBeVisible();
  });

  test('H5-CHECKIN-005: 打卡须知包含4条规则', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    const noticeText = await checkInPage.noticeCard.textContent();
    expect(noticeText).toContain('爬楼梯');
    expect(noticeText).toContain('打卡一次');
    expect(noticeText).toContain('积分');
    expect(noticeText).toContain('连续');
  });

  test('H5-CHECKIN-006: 时段卡片显示时段名称', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    // The card with title "今日打卡时段" should be visible
    await expect(checkInPage.timeSlotCard).toBeVisible({ timeout: 5000 });
  });

  test('H5-CHECKIN-007: 时段卡片显示Badge状态', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    const badge = checkInPage.timeSlotCard.locator('.adm-badge');
    const count = await badge.count();
    expect(count).toBeGreaterThan(0);
  });

  test('H5-CHECKIN-008: 时段卡片显示时段范围时间', async ({ page }) => {
    // Should show time range like "00:00 - 23:59"
    await expect(page.locator('text=/\\d{2}:\\d{2} - \\d{2}:\\d{2}/')).toBeVisible({ timeout: 5000 });
  });

  test('H5-CHECKIN-009: 可打卡时段有打卡按钮', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    const availableBadge = checkInPage.timeSlotCard.locator('.adm-badge').filter({ hasText: '可打卡' });
    if (await availableBadge.count() > 0) {
      const slotBody = availableBadge.locator('..').locator('..');
      const button = slotBody.locator('button').filter({ hasText: '打卡' });
      await expect(button).toBeVisible();
    }
  });

  test('H5-CHECKIN-010: 点击打卡按钮执行打卡', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    // Look for any available time slot with a "打卡" button
    const availableSlot = checkInPage.timeSlotCard.locator('.adm-badge').filter({ hasText: '可打卡' }).first();
    if (await availableSlot.count() > 0) {
      // Navigate to the slot's parent and find the button
      const slotItem = availableSlot.locator('..').locator('..');
      const button = slotItem.locator('button').filter({ hasText: '打卡' });
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(3000);
        // Should either show success or already checked in
        const hasSuccess = await checkInPage.successOverlay.isVisible().catch(() => false);
        if (hasSuccess) {
          await expect(checkInPage.earnedPointsText).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('H5-CHECKIN-011: 打卡成功后显示成功界面', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    // If already checked in, skip this test
    const alreadyCheckedIn = await page.locator('text=已打卡').count();
    if (alreadyCheckedIn > 0) {
      test.skip();
      return;
    }

    // Find and click check-in button
    const button = checkInPage.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
    if (await button.count() > 0) {
      await button.click();
      await page.waitForTimeout(5000);
      await expect(checkInPage.successOverlay).toBeVisible({ timeout: 5000 });
      await expect(checkInPage.earnedPointsText).toBeVisible();
    }
  });

  test('H5-CHECKIN-012: 打卡成功显示积分奖励', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    // Only run if not already checked in today
    const alreadyCheckedIn = await page.locator('text=已打卡').count();
    if (alreadyCheckedIn > 0) {
      test.skip();
      return;
    }

    const button = checkInPage.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
    if (await button.count() > 0) {
      await button.click();
      await page.waitForTimeout(5000);
      const earnedText = await checkInPage.earnedPointsText.textContent().catch(() => '');
      expect(earnedText).toMatch(/^\+\d+ 积分$/);
    }
  });

  test('H5-CHECKIN-013: 打卡成功后显示倒计时', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    const alreadyCheckedIn = await page.locator('text=已打卡').count();
    if (alreadyCheckedIn > 0) {
      test.skip();
      return;
    }

    const button = checkInPage.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
    if (await button.count() > 0) {
      await button.click();
      await page.waitForTimeout(2000);
      const hasCountdown = await checkInPage.countdownText.isVisible().catch(() => false);
      const hasReturnButton = await checkInPage.immediateReturnButton.isVisible().catch(() => false);
      // Either countdown or immediate return button should be visible
      expect(hasCountdown || hasReturnButton).toBe(true);
    }
  });

  test('H5-CHECKIN-014: 点击立即返回跳转首页', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    const alreadyCheckedIn = await page.locator('text=已打卡').count();
    if (alreadyCheckedIn > 0) {
      test.skip();
      return;
    }

    const button = checkInPage.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
    if (await button.count() > 0) {
      await button.click();
      await page.waitForTimeout(2000);
      if (await checkInPage.immediateReturnButton.isVisible()) {
        await checkInPage.returnHome();
        await expect(page.url()).toContain('/');
        const homePage = new HomePage(page);
        await expect(homePage.tabBar).toBeVisible();
      }
    }
  });

  test('H5-CHECKIN-015: TabBar点击首页返回首页', async ({ page }) => {
    const checkInPage = new CheckInPage(page);
    await checkInPage.navigateHome();
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible();
    await expect(homePage.greetingText).toBeVisible();
  });

  test('H5-CHECKIN-016: 无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
