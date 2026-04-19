import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class DashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly checkinChart: Locator;
  readonly pointsChart: Locator;

  constructor(page: Page) {
    this.page = page;
    // GlassCardStat components - look for stat card containers
    this.statCards = page.locator('[class*="glassCard"]');
    this.checkinChart = page.locator('text=签到趋势').first();
    this.pointsChart = page.locator('text=积分概况').first();
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/dashboard`);
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async getStatCardValues(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const labels = await this.page.locator('text=今日签到,text=今日积分,text=活跃成员,text=本月兑换').all();
    for (const label of labels) {
      const text = await label.textContent();
      if (text) {
        stats[text] = text;
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
