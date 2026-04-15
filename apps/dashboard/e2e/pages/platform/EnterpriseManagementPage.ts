import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class EnterpriseManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '开通企业' });
    this.searchInput = page.locator('.ant-input-search');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/platform/enterprises`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async clickAddEnterprise() {
    await this.addButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillEnterpriseForm(name: string, contactName: string, contactPhone: string) {
    const modal = this.page.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(name);
    await inputs.nth(1).fill(contactName);
    await inputs.nth(2).fill(contactPhone);
  }

  async selectPackage(packageName: string) {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('.ant-select').click();
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: packageName }).click();
  }

  async submitEnterprise() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确认开通' }).click();
  }

  async searchEnterprise(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async toggleEnterpriseStatus(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const button = rows[rowIndex].locator('button').filter({ hasText: '停用' }).or(rows[rowIndex].locator('button').filter({ hasText: '开通' }));
      await button.click();
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).click();
    }
  }

  async openEnterpriseDetail(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '详情' }).click();
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    }
  }

  async getEnterpriseCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}