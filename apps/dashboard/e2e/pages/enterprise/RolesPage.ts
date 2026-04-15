import { type Page, type Locator } from '@playwright/test';

export class RolesPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '新增自定义角色' });
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/roles');
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async clickAddRole() {
    await this.addButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillRoleForm(name: string, description: string) {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('input').first().fill(name);
    await modal.locator('textarea').fill(description);
  }

  async selectPermissions(permKeys: string[]) {
    const modal = this.page.locator('.ant-modal');
    for (const key of permKeys) {
      const checkbox = modal.locator('.ant-tree-node-content-wrapper').filter({ hasText: key }).locator('.ant-checkbox');
      await checkbox.click();
    }
  }

  async submitRole() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确定' }).click();
  }

  async getRoleCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }

  async editRole(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '编辑权限' }).click();
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    }
  }

  async deleteRole(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '删除' }).click();
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).click();
    }
  }
}