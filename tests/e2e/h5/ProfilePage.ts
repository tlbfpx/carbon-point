import { Page } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User Profile Page
 * Maps to: saas-frontend/h5/src/pages/ProfilePage.tsx
 */
export class H5ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/profile'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
  }

  // User header section
  get userHeader() {
    return this.page.locator('div').filter({ hasText: /ID: / }).first();
  }

  get userName() {
    return this.page.locator('p').filter({ hasText: /^[^\s]+$/ }).first();
  }

  get userId() {
    return this.page.locator('p').filter({ hasText: /ID:/ });
  }

  get userLevel() {
    return this.page.locator('p').filter({ hasText: /Lv\.\d/ }).first();
  }

  // Points card
  get pointsCard() {
    return this.admCard('我的积分');
  }

  get totalPointsDisplay() {
    return this.pointsCard.locator('p').first();
  }

  // Personal info card
  get personalInfoCard() {
    return this.admCard('个人信息');
  }

  get usernameRow() {
    return this.admListItem('用户名');
  }

  get phoneRow() {
    return this.admListItem('手机号');
  }

  get emailRow() {
    return this.admListItem('邮箱');
  }

  // Settings card
  get settingsCard() {
    return this.admCard('设置');
  }

  get notificationsSwitch() {
    return this.settingsCard.locator('.adm-switch').first();
  }

  get soundSwitch() {
    return this.settingsCard.locator('.adm-switch').nth(1);
  }

  // Logout button
  get logoutButton() {
    return this.page.locator('button').filter({ hasText: '退出登录' }).first();
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

  async clickLogout() {
    await this.logoutButton.click();
    // Wait for redirect to login page
    await this.page.waitForURL('**/login', { timeout: 8000 });
  }

  async isLoggedOut(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
  }
}
