import { Page, Locator } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User CheckIn Page
 * Maps to: saas-frontend/h5/src/pages/CheckInPage.tsx
 */
export class H5CheckInPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/checkin'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
  }

  // Time slot card
  get timeSlotCard() {
    return this.admCard('今日打卡时段');
  }

  // Check-in success overlay
  get successOverlay() {
    return this.page.locator('text=打卡成功');
  }

  get congratulationsText() {
    return this.page.locator('h2').filter({ hasText: '恭喜完成打卡' });
  }

  get earnedPointsText() {
    return this.page.locator('p').filter({ hasText: /^\+\d+$/ }).first();
  }

  get pointsLabel() {
    return this.page.locator('p').filter({ hasText: '积分' }).first();
  }

  get countdownText() {
    return this.page.locator('p').filter({ hasText: /秒后自动返回/ }).first();
  }

  get immediateReturnButton() {
    return this.page.locator('button').filter({ hasText: '立即返回' }).first();
  }

  // Notice card
  get noticeCard() {
    return this.admCard('打卡须知');
  }

  get viewHistoryLink() {
    return this.page.locator('span').filter({ hasText: '查看打卡历史' });
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

  get mallTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '商城' }).first();
  }

  get couponsTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '卡券' }).first();
  }

  get profileTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '我的' }).first();
  }

  /**
   * Get the first available check-in button.
   */
  getFirstCheckInButton(): Locator {
    return this.timeSlotCard.locator('button').filter({ hasText: '打卡' }).first();
  }

  /**
   * Get badge for a specific status within the time slot card.
   * status: '可打卡' | '已打卡' | '未开始' | '已结束'
   */
  getBadge(status: string): Locator {
    return this.timeSlotCard.locator('.adm-badge').filter({ hasText: status });
  }

  async clickCheckInButton() {
    const button = this.getFirstCheckInButton();
    if (await button.count() > 0) {
      await button.click();
    }
  }

  async returnHome() {
    await this.immediateReturnButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isOnCheckInPage(): Promise<boolean> {
    return this.page.url().includes('/checkin');
  }
}
