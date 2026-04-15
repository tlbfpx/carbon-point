import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class MemberPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly importButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '添加员工' });
    this.importButton = page.locator('button').filter({ hasText: '批量导入' });
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="姓名"], input.ant-input');
    this.table = page.locator('.ant-table');
    this.pagination = page.locator('.ant-pagination');
  }

  async navigateToMemberPage() {
    await this.page.locator('text=员工管理').first().click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle');
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

  async cancelAddEmployee() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '取消' }).click();
    await this.page.waitForTimeout(500);
  }

  async searchKeyword(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1500);
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
      const toggleButton = rows.nth(rowIndex).locator('button').filter({ hasText: '停用' });
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async enableMember(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (rowIndex < count) {
      const enableButton = rows.nth(rowIndex).locator('button').filter({ hasText: '启用' });
      if (await enableButton.isVisible()) {
        await enableButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async clickInviteMember(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (rowIndex < count) {
      const inviteBtn = rows.nth(rowIndex).locator('button').filter({ hasText: '邀请' });
      if (await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async clickImportButton() {
    await this.importButton.click();
    await this.page.waitForTimeout(500);
  }

  async expectModalVisible() {
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async getRowCell(rowIndex: number, colIndex: number): Promise<Locator> {
    const rows = await this.getTableRows();
    return rows.nth(rowIndex).locator('td').nth(colIndex);
  }
}
