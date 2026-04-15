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
    // Navigate to system management page via sidebar click
    await this.page.waitForSelector('.ant-layout-sider', { timeout: 15000 });
    await this.page.click('text=系统管理', { force: true });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ant-tabs', { timeout: 15000 });
  }

  async switchToTab(tabName: string) {
    await this.tabs.filter({ hasText: tabName }).click();
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  // Platform Admin tab methods
  async clickCreateAdmin() {
    await this.page.locator('button').filter({ hasText: '创建管理员' }).click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillCreateAdminForm(data: { username: string; phone: string; password: string; email?: string; roles?: string[] }) {
    await this.page.locator('.ant-modal input[placeholder*="用户名"]').fill(data.username);
    await this.page.locator('.ant-modal input[placeholder*="手机"]').fill(data.phone);
    await this.page.locator('.ant-modal input[placeholder*="密码"]').fill(data.password);
    if (data.email) {
      await this.page.locator('.ant-modal input[placeholder*="邮箱"]').fill(data.email);
    }
    if (data.roles && data.roles.length > 0) {
      // Click the role select dropdown
      await this.page.locator('.ant-modal .ant-select').click();
      await this.page.waitForTimeout(500);
      for (const role of data.roles) {
        await this.page.locator(`.ant-select-dropdown .ant-select-item-option`).filter({ hasText: role }).click({ timeout: 3000 });
        await this.page.waitForTimeout(300);
      }
      // Close dropdown by clicking elsewhere
      await this.page.locator('.ant-modal input[placeholder*="用户名"]').click();
      await this.page.waitForTimeout(300);
    }
  }

  async fillCreateAdminFormNoRoles(data: { username: string; phone: string; password: string; email?: string }) {
    await this.page.locator('.ant-modal input[placeholder*="用户名"]').fill(data.username);
    await this.page.locator('.ant-modal input[placeholder*="手机"]').fill(data.phone);
    await this.page.locator('.ant-modal input[placeholder*="密码"]').fill(data.password);
    if (data.email) {
      await this.page.locator('.ant-modal input[placeholder*="邮箱"]').fill(data.email);
    }
  }

  async submitCreateAdmin() {
    await this.page.locator('.ant-modal button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async clickEditAdminByUsername(username: string) {
    // Wait for table to be populated
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
    const row = this.table.locator('.ant-table-tbody tr').filter({ hasText: username });
    const editBtn = row.locator('button').filter({ hasText: '编辑' });
    await editBtn.waitFor({ timeout: 5000 });
    await editBtn.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillEditAdminForm(data: { username?: string; phone?: string; email?: string; roles?: string[] }) {
    if (data.username) {
      const input = this.page.locator('.ant-modal input[placeholder*="用户名"]');
      await input.clear();
      await input.fill(data.username);
    }
    if (data.phone) {
      const input = this.page.locator('.ant-modal input[placeholder*="手机"]');
      await input.clear();
      await input.fill(data.phone);
    }
    if (data.email) {
      const input = this.page.locator('.ant-modal input[placeholder*="邮箱"]');
      await input.clear();
      await input.fill(data.email);
    }
  }

  async submitEditAdmin() {
    await this.page.locator('.ant-modal button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async clickDeleteAdminByUsername(username: string) {
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
    const row = this.table.locator('.ant-table-tbody tr').filter({ hasText: username });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    await deleteBtn.waitFor({ timeout: 5000 });
    await deleteBtn.click();
    await this.page.waitForSelector('.ant-popover', { timeout: 3000 });
  }

  async confirmDeleteAdmin() {
    await this.page.locator('.ant-popover button').filter({ hasText: '确定' }).click();
    await this.page.waitForTimeout(2000);
  }

  async getAdminTableRowCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }

  async searchAdminByUsername(username: string) {
    await this.page.locator('input[placeholder*="用户名"]').fill(username);
    await this.page.locator('button').filter({ hasText: '查询' }).click();
    await this.page.waitForTimeout(1000);
  }

  async resetAdminSearch() {
    await this.page.locator('button').filter({ hasText: '重置' }).click();
    await this.page.waitForTimeout(1000);
  }

  // Operation Log tab methods
  async searchOperator(operator: string) {
    await this.page.locator('input[placeholder*="操作人"]').fill(operator);
    await this.page.locator('button').filter({ hasText: '查询' }).click();
    await this.page.waitForTimeout(1000);
  }

  async selectOperationType(type: string) {
    await this.page.locator('.ant-select').filter({ hasText: type }).click();
    await this.page.waitForTimeout(500);
  }

  async selectDateRange(startDate: string, endDate: string) {
    const dateRangePicker = this.page.locator('.ant-picker-range');
    await dateRangePicker.click();
    await this.page.locator('.ant-picker-input input').first().fill(startDate);
    await this.page.locator('.ant-picker-input input').last().fill(endDate);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async clickReset() {
    await this.page.locator('button').filter({ hasText: '重置' }).click();
    await this.page.waitForTimeout(1000);
  }

  async clickRefresh() {
    await this.page.locator('button').filter({ hasText: '刷新' }).click();
    await this.page.waitForTimeout(1000);
  }

  async getLogTableRowCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }

  async isAdminVisibleByUsername(username: string): Promise<boolean> {
    const row = this.table.locator('.ant-table-tbody tr').filter({ hasText: username });
    return await row.isVisible();
  }

  async closeModal() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }
}
