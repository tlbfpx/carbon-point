import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class RolesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2').filter({ hasText: '角色权限' });
    this.addButton = page.locator('button').filter({ hasText: '新增自定义角色' });
    this.table = page.locator('.ant-table');
    this.tableRows = this.table.locator('.ant-table-tbody tr');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/ roles`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async clickAddRole() {
    await this.addButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async getModal(): Locator {
    return this.page.locator('.ant-modal');
  }

  async getModalTitle(): Promise<string> {
    const modal = this.getModal();
    return await modal.locator('.ant-modal-title').textContent() || '';
  }

  async fillRoleName(name: string) {
    const modal = this.getModal();
    // Fill the first input in the modal (role name field)
    const nameInput = modal.locator('input').first();
    await nameInput.fill(name);
  }

  async fillRoleDescription(description: string) {
    const modal = this.getModal();
    await modal.locator('textarea').fill(description);
  }

  async selectPermissions(permKeys: string[]) {
    const modal = this.getModal();
    for (const key of permKeys) {
      const node = modal.locator('.ant-tree-node-content-wrapper').filter({ hasText: key }).first();
      if (await node.isVisible()) {
        await node.click();
        await this.page.waitForTimeout(200);
      }
    }
  }

  async checkPermission(permText: string) {
    const modal = this.getModal();
    const checkbox = modal.locator('.ant-tree-node-content-wrapper').filter({ hasText: permText }).locator('.ant-checkbox').first();
    await checkbox.click();
  }

  async submitRole() {
    const modal = this.getModal();
    await modal.locator('button').filter({ hasText: '确定' }).click();
    await this.page.waitForTimeout(1000);
  }

  async cancelRole() {
    const modal = this.getModal();
    await modal.locator('button').filter({ hasText: '取消' }).click();
    await this.page.waitForTimeout(500);
  }

  async closeModal() {
    const modal = this.getModal();
    const closeBtn = modal.locator('button.ant-modal-close').or(modal.locator('.ant-modal-close'));
    await closeBtn.click();
    await this.page.waitForTimeout(300);
  }

  async getRoleCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async viewRole(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '查看权限' }).click();
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    }
  }

  async editRole(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '编辑权限' }).click();
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    }
  }

  async deleteRole(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '删除' }).click();
      await this.page.waitForSelector('.ant-popover, .ant-modal-confirm', { timeout: 5000 });
      // Confirm delete
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).or(
        this.page.locator('.ant-modal-confirm .ant-btn').filter({ hasText: '确定' })
      ).click();
      await this.page.waitForTimeout(1000);
    }
  }

  async getRoleName(rowIndex: number): Promise<string> {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      return await rows[rowIndex].locator('.ant-table-cell').first().textContent() || '';
    }
    return '';
  }

  async expectEditButtonDisabled(rowIndex: number): Promise<boolean> {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const editBtn = rows[rowIndex].locator('button').filter({ hasText: '编辑权限' });
      const isDisabled = await editBtn.getAttribute('disabled');
      return isDisabled !== null;
    }
    return false;
  }

  async expectDeleteButtonDisabled(rowIndex: number): Promise<boolean> {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const deleteBtn = rows[rowIndex].locator('button').filter({ hasText: '删除' });
      const isDisabled = await deleteBtn.getAttribute('disabled');
      return isDisabled !== null;
    }
    return false;
  }
}
