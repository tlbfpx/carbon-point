import { type Page, type Locator } from '@playwright/test';

export class PlatformDashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly charts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-card');
    this.charts = page.locator('.ant-card').filter({ hasText: /趋势|统计/ });
  }

  async goto() {
    await this.page.goto('/#/platform/dashboard');
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async getEnterpriseCount(): Promise<string> {
    const card = this.statCards.filter({ hasText: '企业总数' });
    return await card.locator('.ant-statistic-content-value').textContent() || '0';
  }

  async expectChartsVisible() {
    await this.charts.first().waitFor({ state: 'visible', timeout: 10000 });
  }
}