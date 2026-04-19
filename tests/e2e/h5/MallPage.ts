import { Page } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User Mall Page
 * Maps to: saas-frontend/h5/src/pages/MallPage.tsx
 */
export class H5MallPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/mall'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
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

  // Empty state
  get emptyState() {
    return this.page.locator('text=暂无商品');
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

  get couponsTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '卡券' }).first();
  }

  get profileTab() {
    return this.admTabBar().locator('.adm-tab-bar-item').filter({ hasText: '我的' }).first();
  }

  getProductCard(name: string) {
    return this.productList.locator('.adm-card').filter({ hasText: name });
  }

  getProductExchangeButton(name: string) {
    return this.getProductCard(name).locator('button').filter({ hasText: '兑换' });
  }

  async searchProduct(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search to complete
    await this.page.waitForLoadState('networkidle');
  }

  async clickProduct(name: string) {
    await this.getProductCard(name).click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateHome() {
    await this.homeTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateProfile() {
    await this.profileTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isOnMallPage(): Promise<boolean> {
    return this.page.url().includes('/mall');
  }
}
