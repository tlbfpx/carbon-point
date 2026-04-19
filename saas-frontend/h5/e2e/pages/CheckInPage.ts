import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class CheckInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/checkin`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // Time slot card
  get timeSlotCard() {
    return this.page.locator('.adm-card').filter({ hasText: '今日打卡时段' });
  }

  // Check-in success overlay
  get successOverlay() {
    return this.page.locator('text=打卡成功');
  }

  get earnedPointsText() {
    return this.page.locator('text=/\\+\\d+ 积分/').first();
  }

  get countdownText() {
    return this.page.locator('text=/\\d+ 秒后自动返回/').first();
  }

  get immediateReturnButton() {
    return this.page.locator('button').filter({ hasText: '立即返回' }).first();
  }

  // Time slot items
  getTimeSlotCard(name: string) {
    return this.timeSlotCard.locator('.adm-card-body').filter({ hasText: name });
  }

  getTimeSlotBadge(name: string, status: string) {
    // status: '可打卡' | '已打卡' | '未开始' | '已结束'
    return this.timeSlotCard.locator('.adm-badge').filter({ hasText: status });
  }

  getTimeSlotButton(name: string) {
    return this.timeSlotCard.locator('button').filter({ hasText: '打卡' });
  }

  // Notice card
  get noticeCard() {
    return this.page.locator('.adm-card').filter({ hasText: '打卡须知' });
  }

  // Tab bar
  get tabBar() {
    return this.page.locator('.adm-tab-bar');
  }

  get homeTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '首页' }).first();
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

  async clickCheckInButton(ruleName: string = '基础积分规则') {
    await this.getTimeSlotButton(ruleName).click();
  }

  async returnHome() {
    await this.immediateReturnButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
