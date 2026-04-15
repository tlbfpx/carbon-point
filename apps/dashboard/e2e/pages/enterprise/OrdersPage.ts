import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class OrdersPage {
  readonly page: Page;
  readonly statusFilter: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusFilter = page.locator('.ant-select');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/orders`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async filterByStatus(status: 'pending' | 'completed' | 'cancelled') {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      completed: '已完成',
      cancelled: '已取消'
    };
    await this.statusFilter.first().click();
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: statusMap[status] }).click();
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getOrderCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }
}