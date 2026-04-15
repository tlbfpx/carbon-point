import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PointsPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-card');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/points`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async getTotalPoints(): Promise<string> {
    const card = this.statCards.filter({ hasText: '总积分' });
    return await card.locator('.ant-statistic-content-value').textContent() || '0';
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }
}