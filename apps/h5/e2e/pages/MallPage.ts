import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class MallPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/mall`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // Search bar
  get searchBar() {
    return this.page.locator('.adm-search-bar-input');
  }

  get searchInput() {
    return this.page.locator('input[placeholder="搜索商品"]');
  }

  // Product list
  get productList() {
    return this.page.locator('.adm-list');
  }

  get productCards() {
    return this.page.locator('.adm-card');
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

  get couponsTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '卡券' }).first();
  }

  get profileTab() {
    return this.page.locator('.adm-tab-bar-item').filter({ hasText: '我的' }).first();
  }

  getProductCard(name: string) {
    return this.productList.locator('.adm-card').filter({ hasText: name });
  }

  getProductExchangeButton(name: string) {
    return this.getProductCard(name).locator('button').filter({ hasText: '兑换' });
  }

  async searchProduct(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1000);
  }

  async clickProduct(name: string) {
    await this.getProductCard(name).click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async navigateProfile() {
    await this.profileTab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
