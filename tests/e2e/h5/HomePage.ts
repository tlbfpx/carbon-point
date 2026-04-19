import { Page } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User Home Page
 * Maps to: saas-frontend/h5/src/pages/HomePage.tsx
 */
export class H5HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
  }

  // Page title / greeting
  get greetingText() {
    return this.page.locator('h1').first();
  }

  get subtitle() {
    return this.page.locator('p').filter({ hasText: '坚持运动，健康生活' });
  }

  // Check-in status card
  get checkInStatusCard() {
    return this.admCard('今日打卡状态');
  }

  get checkedInIndicator() {
    return this.page.locator('p').filter({ hasText: '今日已打卡' }).first();
  }

  get notCheckedInText() {
    return this.page.locator('p').filter({ hasText: '今日尚未打卡' }).first();
  }

  get checkInButton() {
    return this.page.locator('button').filter({ hasText: '立即打卡' }).first();
  }

  // Quick entry section
  get quickEntrySection() {
    return this.admCard('快捷入口');
  }

  get checkinEntry() {
    return this.quickEntrySection.locator('span').filter({ hasText: '打卡' }).first();
  }

  get pointsEntry() {
    return this.quickEntrySection.locator('span').filter({ hasText: '积分' }).first();
  }

  get mallEntry() {
    return this.quickEntrySection.locator('span').filter({ hasText: '商城' }).first();
  }

  get notificationsEntry() {
    return this.quickEntrySection.locator('span').filter({ hasText: '消息' }).first();
  }

  // Leaderboard card
  get leaderboardCard() {
    return this.admCard('排行榜');
  }

  // Tab bar — delegate to inherited admTabBar()
  get tabBar() {
    return this.admTabBar();
  }

  get homeTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '首页' }).first();
  }

  get checkinTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '打卡' }).first();
  }

  get mallTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '商城' }).first();
  }

  get couponsTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '卡券' }).first();
  }

  get profileTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '我的' }).first();
  }

  async navigateToCheckin() {
    await this.checkinEntry.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToPoints() {
    await this.pointsEntry.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToMall() {
    await this.mallEntry.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToNotifications() {
    await this.notificationsEntry.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToProfile() {
    await this.profileTab.click();
    await this.page.waitForLoadState('networkidle');
  }
}
