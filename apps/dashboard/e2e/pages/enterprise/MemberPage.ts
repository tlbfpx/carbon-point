import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class MemberPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly importButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '添加' });
    this.importButton = page.locator('button').filter({ hasText: '批量导入' });
    this.searchInput = page.locator('.ant-input-search');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/members`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async clickAddEmployee() {
    await this.addButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillAddEmployeeForm(name: string, phone: string) {
    const modal = this.page.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(name);
    await inputs.nth(1).fill(phone);
  }

  async submitAddEmployee() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确定' }).click();
  }

  async searchKeyword(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getMemberCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }

  async toggleMemberStatus(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (rowIndex < count) {
      const toggleButton = rows.nth(rowIndex).locator('button').filter({ hasText: '停用' }).or(rows.nth(rowIndex).locator('button').filter({ hasText: '启用' }));
      await toggleButton.click();
      await this.page.waitForTimeout(500);
    }
  }
}