import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class DashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly checkinChart: Locator;
  readonly pointsChart: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-statistic');
    this.checkinChart = page.locator('.ant-card').filter({ hasText: '打卡趋势' });
    this.pointsChart = page.locator('.ant-card').filter({ hasText: '积分发放趋势' });
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/dashboard`);
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async getStatCardValues(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const statElements = await this.statCards.all();
    for (const stat of statElements) {
      const title = await stat.locator('.ant-statistic-title').textContent();
      const value = await stat.locator('.ant-statistic-content-value').textContent();
      if (title && value) {
        stats[title] = value;
      }
    }
    return stats;
  }

  async expectChartsVisible() {
    await this.checkinChart.waitFor({ state: 'visible', timeout: 10000 });
    await this.pointsChart.waitFor({ state: 'visible', timeout: 10000 });
  }

  async expectChartsRendered() {
    await this.page.waitForSelector('svg.recharts-surface', { timeout: 10000 });
  }
}