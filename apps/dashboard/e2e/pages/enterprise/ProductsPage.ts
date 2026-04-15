import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class ProductsPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '新增商品' });
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/products`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async toggleProductStatus(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getProductCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}