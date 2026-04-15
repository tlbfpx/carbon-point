import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class ReportsPage {
  readonly page: Page;
  readonly dateRangePicker: Locator;
  readonly exportButtons: Locator;
  readonly charts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dateRangePicker = page.locator('.ant-picker-range');
    this.exportButtons = page.locator('button').filter({ hasText: '导出' });
    this.charts = page.locator('.ant-card').filter({ hasText: /趋势/ });
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/reports`);
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async exportCheckinReport() {
    const btn = this.exportButtons.filter({ hasText: '打卡报表' });
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async exportPointsReport() {
    const btn = this.exportButtons.filter({ hasText: '积分报表' });
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async expectChartsVisible() {
    await this.charts.first().waitFor({ state: 'visible', timeout: 10000 });
  }
}