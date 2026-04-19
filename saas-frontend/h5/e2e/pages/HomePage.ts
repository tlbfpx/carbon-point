import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // Greeting section
  get greetingText() {
    return this.page.locator('h1').first();
  }

  // Check-in status card
  get checkInStatusCard() {
    return this.page.locator('.adm-card').filter({ hasText: '今日打卡状态' });
  }

  get checkedInIndicator() {
    return this.page.locator('text=今日已打卡').first();
  }

  get notCheckedInText() {
    return this.page.locator('text=今日尚未打卡').first();
  }

  get checkInButton() {
    return this.page.locator('button').filter({ hasText: '立即打卡' }).first();
  }

  // Quick entry cards
  get quickEntrySection() {
    return this.page.locator('.adm-card').filter({ hasText: '快捷入口' });
  }

  get checkinEntry() {
    return this.page.locator('.adm-card').filter({ hasText: '快捷入口' }).locator('span').filter({ hasText: '打卡' }).first();
  }

  get pointsEntry() {
    return this.page.locator('.adm-card').filter({ hasText: '快捷入口' }).locator('span').filter({ hasText: '积分' }).first();
  }

  get mallEntry() {
    return this.page.locator('.adm-card').filter({ hasText: '快捷入口' }).locator('span').filter({ hasText: '商城' }).first();
  }

  get notificationsEntry() {
    return this.page.locator('.adm-card').filter({ hasText: '快捷入口' }).locator('span').filter({ hasText: '消息' }).first();
  }

  // Leaderboard card
  get leaderboardCard() {
    return this.page.locator('.adm-card').filter({ hasText: '排行榜' });
  }

  get levelSteps() {
    return this.page.locator('.adm-steps');
  }

  // Tab bar
  get tabBar() {
    return this.page.locator('.adm-tab-bar');
  }

  get homeTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '首页' }).first();
  }

  get checkinTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '打卡' }).first();
  }

  get mallTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '商城' }).first();
  }

  get couponsTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '卡券' }).first();
  }

  get profileTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '我的' }).first();
  }

  async navigateToCheckin() {
    await this.checkinEntry.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateToPoints() {
    await this.pointsEntry.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateToMall() {
    await this.mallEntry.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateToNotifications() {
    await this.notificationsEntry.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateToProfile() {
    await this.profileTab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
