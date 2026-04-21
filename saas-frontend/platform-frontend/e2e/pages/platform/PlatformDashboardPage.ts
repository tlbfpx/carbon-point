import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PlatformDashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly segmented: Locator;
  readonly exportButton: Locator;
  readonly statCards: Locator;
  readonly areaChart: Locator;
  readonly lineChart: Locator;
  readonly barChart: Locator;
  readonly rankingTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('.ant-layout-sider');
    this.segmented = page.locator('.ant-segmented');
    this.exportButton = page.locator('button:has-text("导出报表")');
    this.statCards = page.locator('.ant-statistic');
    this.areaChart = page.locator('.recharts-areaChart').first();
    this.lineChart = page.locator('.recharts-lineChart').first();
    this.barChart = page.locator('.recharts-barChart').first();
    this.rankingTable = page.locator('h2:has-text("企业排行详情") + * table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/dashboard`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectVisible() {
    await expect(this.sidebar).toBeVisible();
    await this.page.waitForLoadState('networkidle');
    // Wait for dashboard content to load
    await this.statCards.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  async switchDimension(dim: 'day' | 'week' | 'month') {
    const labels: Record<string, string> = {
      day: '按日',
      week: '按周',
      month: '按月'
    };
    await this.segmented.locator(`text=${labels[dim]}`).click();
    // Wait for chart to update
    await this.areaChart.waitFor({ state: 'visible', timeout: 5000 });
  }
}