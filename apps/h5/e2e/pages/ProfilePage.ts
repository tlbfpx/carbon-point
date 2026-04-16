import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/profile`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // User info header
  get userHeader() {
    return this.page.locator('.adm-card').first();
  }

  get userName() {
    return this.page.locator('p').filter({ hasText: /^(?!.*积分|.*排名|.*打卡).*$/ }).first();
  }

  get userId() {
    return this.page.locator('text=/ID:/');
  }

  get pointsDisplay() {
    return this.page.locator('text=我的积分');
  }

  // Points card
  get pointsCard() {
    return this.page.locator('.adm-card').filter({ hasText: '我的积分' });
  }

  // Personal info card
  get personalInfoCard() {
    return this.page.locator('.adm-card').filter({ hasText: '个人信息' });
  }

  get usernameRow() {
    return this.personalInfoCard.locator('.adm-list-item').filter({ hasText: '用户名' });
  }

  get phoneRow() {
    return this.personalInfoCard.locator('.adm-list-item').filter({ hasText: '手机号' });
  }

  // Settings card
  get settingsCard() {
    return this.page.locator('.adm-card').filter({ hasText: '设置' });
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

  async clickLogout() {
    await this.logoutButton.click();
    await this.page.waitForTimeout(2000);
  }

  async isLoggedOut(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}
