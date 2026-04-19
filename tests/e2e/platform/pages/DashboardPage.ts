import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class PlatformDashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly statCards: Locator;
  readonly segmented: Locator;
  readonly exportButton: Locator;
  readonly areaChart: Locator;
  readonly lineChart: Locator;
  readonly barChart: Locator;
  readonly rankingTable: Locator;
  readonly rankingRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('.ant-layout-sider');
    this.statCards = page.locator('.ant-statistic');
    this.segmented = page.locator('.ant-segmented');
    this.exportButton = page.locator('button').filter({ hasText: '导出报表' });
    this.areaChart = page.locator('.recharts-areaChart').first();
    this.lineChart = page.locator('.recharts-lineChart').first();
    this.barChart = page.locator('.recharts-barChart').first();
    this.rankingTable = page.locator('.ant-table').filter({ hasText: '排名' });
    this.rankingRows = this.rankingTable.locator('.ant-table-tbody tr');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/platform/dashboard');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Wait for charts to render
  }

  async expectVisible(): Promise<void> {
    await this.sidebar.waitFor({ state: 'visible' });
  }

  async getStatCardTitles(): Promise<string[]> {
    const titles = this.statCards.locator('.ant-statistic-title');
    const count = await titles.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push((await titles.nth(i).textContent()) || '');
    }
    return result;
  }

  async getStatCardValues(): Promise<string[]> {
    const values = this.statCards.locator('.ant-statistic-content-value');
    const count = await values.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push((await values.nth(i).textContent()) || '');
    }
    return result;
  }

  async switchDimension(dim: 'day' | 'week' | 'month'): Promise<void> {
    const labels: Record<string, string> = { day: '按日', week: '按周', month: '按月' };
    await this.segmented.locator(`text=${labels[dim]}`).click();
    await this.page.waitForTimeout(1500);
  }

  async getRankingRowCount(): Promise<number> {
    return this.rankingRows.count();
  }

  async getFirstRankingEnterpriseName(): Promise<string> {
    const firstRow = this.rankingRows.first();
    if (await firstRow.isVisible()) {
      // Column 2 is enterprise name (排名 is column 1)
      return (await firstRow.locator('td').nth(1).textContent()) || '';
    }
    return '';
  }

  async getBreadcrumbText(): Promise<string> {
    const heading = this.page.locator('h2').filter({ hasText: '平台看板' });
    return (await heading.textContent()) || '';
  }
}
