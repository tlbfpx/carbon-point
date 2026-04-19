import { Page } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User Points Page
 * Maps to: saas-frontend/h5/src/pages/PointsPage.tsx
 */
export class H5PointsPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/points'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
  }

  // Points header
  get pointsHeader() {
    return this.page.locator('p').filter({ hasText: '我的积分' }).first();
  }

  get totalPointsValue() {
    // Large number display: <p style="fontSize: 48}">{totalPoints.toLocaleString()}</p>
    return this.page.locator('p').filter({ hasText: /^\d[\d,]*$/ }).first();
  }

  get availablePointsText() {
    return this.page.locator('p').filter({ hasText: /可用: \d/ });
  }

  get levelBadge() {
    return this.page.locator('span').filter({ hasText: /Lv\.\d/ }).first();
  }

  get levelProgressCard() {
    return this.admCard('等级进度');
  }

  get levelProgressBar() {
    return this.page.locator('.adm-progress-bar');
  }

  // Points history card
  get pointsHistoryCard() {
    return this.admCard('积分明细');
  }

  get pointsHistoryList() {
    return this.pointsHistoryCard.locator('.adm-list');
  }

  // Leaderboard card
  get leaderboardCard() {
    return this.admCard('排行榜');
  }

  get myRankBadge() {
    return this.page.locator('div').filter({ hasText: '我的排名' }).first();
  }

  get leaderboardList() {
    return this.leaderboardCard.locator('.adm-list');
  }

  // Loading state
  get loadingIndicator() {
    return this.page.locator('.adm-dot-loading');
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

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCheckin() {
    await this.checkinTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getTotalPointsNumber(): Promise<number> {
    const text = await this.totalPointsValue.textContent().catch(() => '0');
    return parseInt(text?.replace(/,/g, '') || '0', 10);
  }

  async isOnPointsPage(): Promise<boolean> {
    return this.page.url().includes('/points');
  }
}
