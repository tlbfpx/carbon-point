import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class ReportsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly dateRangePicker: Locator;
  readonly exportCheckinBtn: Locator;
  readonly exportPointsBtn: Locator;
  readonly exportOrdersBtn: Locator;
  readonly statCards: Locator;
  readonly checkinTrendChart: Locator;
  readonly pointsTrendChart: Locator;
  readonly checkinTable: Locator;
  readonly pointsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2').filter({ hasText: '数据报表' });
    this.dateRangePicker = page.locator('.ant-picker-range');
    this.exportCheckinBtn = page.locator('button').filter({ hasText: '导出打卡报表' });
    this.exportPointsBtn = page.locator('button').filter({ hasText: '导出积分报表' });
    this.exportOrdersBtn = page.locator('button').filter({ hasText: '导出订单报表' });
    this.statCards = page.locator('.ant-card');
    this.checkinTrendChart = page.locator('.recharts-lineChart').first();
    this.pointsTrendChart = page.locator('.recharts-barChart').first();
    this.checkinTable = page.locator('.ant-table').filter({ hasText: '打卡数据明细' });
    this.pointsTable = page.locator('.ant-table').filter({ hasText: '积分数据明细' });
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/ reports`);
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async openDateRange(start: string, end: string) {
    await this.dateRangePicker.click();
    await this.page.waitForSelector('.ant-picker-panel', { timeout: 5000 });
  }

  async setDateRange(startDate: string, endDate: string) {
    await this.dateRangePicker.click();
    await this.page.waitForSelector('.ant-picker-panel', { timeout: 5000 });
    // Clear and set start date
    const inputs = this.page.locator('.ant-picker-input input');
    await inputs.first().fill(startDate);
    await inputs.last().fill(endDate);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async exportCheckinReport() {
    await this.exportCheckinBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async exportPointsReport() {
    await this.exportPointsBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async exportOrdersReport() {
    await this.exportOrdersBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async getStatCardValue(cardText: string): Promise<string> {
    const card = this.statCards.filter({ hasText: cardText });
    const value = card.locator('.ant-statistic-content-value, .ant-card-meta-title');
    return await value.textContent() || '';
  }

  async getCheckinCountToday(): Promise<string> {
    return this.getStatCardValue('今日打卡人数');
  }

  async getPointsIssuedToday(): Promise<string> {
    return this.getStatCardValue('今日积分发放');
  }

  async getActiveUsers(): Promise<string> {
    return this.getStatCardValue('活跃用户');
  }

  async getMonthlyExchangeCount(): Promise<string> {
    return this.getStatCardValue('本月兑换量');
  }

  async expectChartsVisible() {
    await this.checkinTrendChart.waitFor({ state: 'visible', timeout: 10000 });
    await this.pointsTrendChart.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getCheckinTableRows(): Promise<Locator> {
    return this.checkinTable.locator('.ant-table-tbody tr');
  }

  async getPointsTableRows(): Promise<Locator> {
    return this.pointsTable.locator('.ant-table-tbody tr');
  }

  async getCheckinTableRowCount(): Promise<number> {
    const rows = await this.getCheckinTableRows();
    return await rows.count();
  }

  async getPointsTableRowCount(): Promise<number> {
    const rows = await this.getPointsTableRows();
    return await rows.count();
  }

  async switchToTab(tabText: string) {
    const tab = this.page.locator('.ant-tabs-tab').filter({ hasText: tabText });
    await tab.click();
    await this.page.waitForTimeout(500);
  }
}
