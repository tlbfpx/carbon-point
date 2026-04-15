import { type Page, type Locator } from '@playwright/test';

export class RulesPage {
  readonly page: Page;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/rules');
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async toggleRule(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getRuleCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}