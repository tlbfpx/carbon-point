import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class SystemManagementPage {
  readonly page: Page;
  readonly table: Locator;
  readonly tabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tabs = page.locator('.ant-tabs-tab');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/platform/system`);
    await this.page.waitForSelector('.ant-tabs', { timeout: 15000 });
  }

  async switchToTab(tabName: string) {
    await this.tabs.filter({ hasText: tabName }).click();
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }
}