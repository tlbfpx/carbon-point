import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../config';

export class SystemManagementPage {
  readonly page: Page;

  // ---- Shared ----
  readonly table: Locator;
  readonly tabs: Locator;
  readonly modal: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  // ---- Admin Tab ----
  readonly createAdminButton: Locator;
  readonly adminTable: Locator;
  readonly adminTableRows: Locator;
  readonly usernameCell: (username: string) => Locator;
  readonly phoneCell: (username: string) => Locator;
  readonly emailCell: (username: string) => Locator;
  readonly roleTag: (username: string, roleText: string) => Locator;
  readonly statusTag: (username: string) => Locator;
  readonly lastLoginCell: (username: string) => Locator;
  readonly createTimeCell: (username: string) => Locator;
  readonly editAdminButton: (username: string) => Locator;
  readonly deleteAdminButton: (username: string) => Locator;

  // Admin modal form fields
  readonly modalUsernameInput: Locator;
  readonly modalPhoneInput: Locator;
  readonly modalPasswordInput: Locator;
  readonly modalEmailInput: Locator;
  readonly modalRoleSelect: Locator;
  readonly modalRoleDropdown: Locator;
  readonly modalRoleOption: (roleText: string) => Locator;
  readonly modalSubmitButton: Locator;
  readonly modalCancelButton: Locator;

  // Pagination
  readonly adminPagination: Locator;
  readonly adminPageNextButton: Locator;
  readonly adminPagePrevButton: Locator;
  readonly adminPageJumperInput: Locator;
  readonly adminPageSizeChanger: Locator;
  readonly adminTotalText: Locator;

  // ---- Log Tab ----
  readonly logTable: Locator;
  readonly logTableRows: Locator;
  readonly logOperatorInput: Locator;
  readonly logActionTypeSelect: Locator;
  readonly logActionTypeOption: (type: string) => Locator;
  readonly logDateRangePicker: Locator;
  readonly logSearchButton: Locator;
  readonly logResetButton: Locator;
  readonly logRefreshButton: Locator;
  readonly logOperatorNameCell: (operator: string) => Locator;
  readonly logActionTag: (operator: string) => Locator;
  readonly logDescriptionCell: (operator: string) => Locator;
  readonly logIpCell: (operator: string) => Locator;
  readonly logTimeCell: (operator: string) => Locator;
  readonly logPagination: Locator;
  readonly logPageNextButton: Locator;
  readonly logPagePrevButton: Locator;
  readonly logTotalText: Locator;

  constructor(page: Page) {
    this.page = page;
    // Shared
    this.table = page.locator('.ant-table');
    this.tabs = page.locator('.ant-tabs-tab');
    this.modal = page.locator('.ant-modal');
    this.confirmButton = page.locator('.ant-modal button[type="submit"]');
    this.cancelButton = page.locator('.ant-modal button').filter({ hasText: '取消' });

    // ---- Admin Tab ----
    this.createAdminButton = page.locator('button').filter({ hasText: '创建管理员' });
    this.adminTable = page.locator('.ant-table');
    this.adminTableRows = page.locator('.ant-table-tbody tr');

    // Per-row cell locators (column order: 用户名, 手机号, 邮箱, 角色, 状态, 最后登录, 创建时间, 操作)
    this.usernameCell = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('td').nth(0);
    this.phoneCell = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('td').nth(1);
    this.emailCell = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('td').nth(2);
    this.roleTag = (username: string, roleText: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('.ant-tag').filter({ hasText: roleText });
    this.statusTag = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('.ant-tag');
    this.lastLoginCell = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('td').nth(5);
    this.createTimeCell = (username: string) =>
      this.adminTableRows.filter({ hasText: username }).locator('td').nth(6);
    this.editAdminButton = (username: string) =>
      // Edit button is icon-only (EditOutlined), find by icon-only button in the row
      this.adminTableRows.filter({ hasText: username }).locator('.ant-btn-icon-only').first();
    this.deleteAdminButton = (username: string) =>
      // Delete button is icon-only (DeleteOutlined), has ant-btn-dangerous class
      this.adminTableRows.filter({ hasText: username }).locator('.ant-btn-dangerous');

    // Admin modal form fields
    this.modalUsernameInput = page.locator('.ant-modal input[placeholder="请输入用户名"]');
    this.modalPhoneInput = page.locator('.ant-modal input[placeholder="请输入手机号"]');
    this.modalPasswordInput = page.locator('.ant-modal input[placeholder="请输入初始密码"]');
    this.modalEmailInput = page.locator('.ant-modal input[placeholder*="邮箱"]');
    this.modalRoleSelect = page.locator('.ant-modal .ant-select');
    this.modalRoleDropdown = page.locator('.ant-select-dropdown');
    this.modalRoleOption = (roleText: string) =>
      page.locator('.ant-select-dropdown .ant-select-item-option').filter({ hasText: roleText });
    this.modalSubmitButton = page.locator('.ant-modal button[type="submit"]');
    this.modalCancelButton = page.locator('.ant-modal button').filter({ hasText: '取消' });

    // Admin pagination
    this.adminPagination = page.locator('.ant-pagination');
    this.adminPageNextButton = page.locator('.ant-pagination .ant-pagination-next');
    this.adminPagePrevButton = page.locator('.ant-pagination .ant-pagination-prev');
    this.adminPageJumperInput = page.locator('.ant-pagination .ant-pagination-options- jumper input');
    this.adminPageSizeChanger = page.locator('.ant-pagination .ant-select');
    this.adminTotalText = page.locator('.ant-pagination .ant-pagination-total-text');

    // ---- Log Tab ----
    this.logTable = page.locator('.ant-table').nth(1);
    this.logTableRows = page.locator('.ant-table').nth(1).locator('.ant-table-tbody tr');
    this.logOperatorInput = page.locator('input[placeholder="搜索操作人"]');
    this.logActionTypeSelect = page.locator('.ant-select').filter({ hasText: '' }).first();
    this.logActionTypeOption = (type: string) =>
      page.locator('.ant-select-dropdown .ant-select-item-option').filter({ hasText: type });
    this.logDateRangePicker = page.locator('.ant-picker-range');
    this.logSearchButton = page.locator('button').filter({ hasText: '查询' });
    this.logResetButton = page.locator('button').filter({ hasText: '重置' });
    this.logRefreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.logOperatorNameCell = (operator: string) =>
      this.logTableRows.filter({ hasText: operator }).locator('td').nth(0);
    this.logActionTag = (operator: string) =>
      this.logTableRows.filter({ hasText: operator }).locator('.ant-tag');
    this.logDescriptionCell = (operator: string) =>
      this.logTableRows.filter({ hasText: operator }).locator('td').nth(2);
    this.logIpCell = (operator: string) =>
      this.logTableRows.filter({ hasText: operator }).locator('td').nth(3);
    this.logTimeCell = (operator: string) =>
      this.logTableRows.filter({ hasText: operator }).locator('td').nth(4);
    this.logPagination = page.locator('.ant-pagination').nth(1);
    this.logPageNextButton = page.locator('.ant-pagination').nth(1).locator('.ant-pagination-next');
    this.logPagePrevButton = page.locator('.ant-pagination').nth(1).locator('.ant-pagination-prev');
    this.logTotalText = page.locator('.ant-pagination').nth(1).locator('.ant-pagination-total-text');
  }

  // ==================== Navigation ====================

  async goto() {
    await this.page.waitForSelector('.ant-layout-sider', { timeout: 15000 });
    await this.page.click('text=系统管理', { force: true });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ant-tabs', { timeout: 15000 });
  }

  async switchToTab(tabName: string) {
    await this.tabs.filter({ hasText: tabName }).click();
    await this.page.waitForTimeout(1000);
  }

  // ==================== Admin Tab ====================

  async openCreateAdminModal() {
    await this.createAdminButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateAdminForm(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
    roles?: string[];
  }) {
    await this.modalUsernameInput.fill(data.username);
    await this.modalPhoneInput.fill(data.phone);
    await this.modalPasswordInput.fill(data.password);
    if (data.email) {
      await this.modalEmailInput.fill(data.email);
    }
    if (data.roles && data.roles.length > 0) {
      await this.selectRoles(data.roles);
    }
  }

  private readonly roleCodeToLabel: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '运营管理员',
    viewer: '只读管理员',
  };

  async selectRoles(roles: string[]) {
    await this.modalRoleSelect.click();
    await this.page.waitForTimeout(500);
    for (const role of roles) {
      const label = this.roleCodeToLabel[role] ?? role;
      await this.modalRoleOption(label).click({ timeout: 3000 });
      await this.page.waitForTimeout(300);
    }
    // Close dropdown by clicking elsewhere
    await this.modalUsernameInput.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Select a single role (for create, where backend expects single role).
   * Accepts either a role code ('admin') or a display label ('运营管理员').
   */
  async selectRole(role: string) {
    await this.modalRoleSelect.click();
    await this.page.waitForTimeout(500);
    const label = this.roleCodeToLabel[role] ?? role;
    await this.modalRoleOption(label).click({ timeout: 3000 });
    await this.page.waitForTimeout(300);
    // Close dropdown by clicking elsewhere
    await this.modalUsernameInput.click();
    await this.page.waitForTimeout(300);
  }

  async submitAdminForm() {
    await this.modalSubmitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async createAdmin(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
    roles?: string[];
  }) {
    await this.openCreateAdminModal();
    await this.fillCreateAdminForm(data);
    await this.submitAdminForm();
  }

  async openEditAdminModal(username: string) {
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
    await this.editAdminButton(username).waitFor({ timeout: 5000 });
    await this.editAdminButton(username).click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillEditAdminForm(data: {
    username?: string;
    phone?: string;
    email?: string;
    roles?: string[];
  }) {
    if (data.username) {
      await this.modalUsernameInput.clear();
      await this.modalUsernameInput.fill(data.username);
    }
    if (data.phone) {
      await this.modalPhoneInput.clear();
      await this.modalPhoneInput.fill(data.phone);
    }
    if (data.email) {
      await this.modalEmailInput.clear();
      await this.modalEmailInput.fill(data.email);
    }
    if (data.roles && data.roles.length > 0) {
      await this.selectRoles(data.roles);
    }
  }

  async editAdmin(username: string, data: {
    username?: string;
    phone?: string;
    email?: string;
    roles?: string[];
  }) {
    await this.openEditAdminModal(username);
    await this.fillEditAdminForm(data);
    await this.submitAdminForm();
  }

  async deleteAdmin(username: string) {
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
    await this.deleteAdminButton(username).waitFor({ timeout: 5000 });
    await this.deleteAdminButton(username).click();
    await this.page.locator('.ant-popover').waitFor({ state: 'visible', timeout: 3000 });
  }

  async confirmDelete() {
    await this.page.locator('.ant-popover button').filter({ hasText: '确认删除' }).click();
    await this.page.waitForTimeout(2000);
  }

  async cancelDelete() {
    await this.page.locator('.ant-popover button').filter({ hasText: '取消' }).click();
    await this.page.waitForTimeout(500);
  }

  // ==================== Status Helpers ====================

  async getAdminStatus(username: string): Promise<string> {
    const tag = this.statusTag(username);
    await tag.waitFor({ state: 'visible', timeout: 5000 });
    return tag.textContent() ?? '';
  }

  async isAdminEnabled(username: string): Promise<boolean> {
    const status = await this.getAdminStatus(username);
    return status === '正常';
  }

  async isAdminDisabled(username: string): Promise<boolean> {
    const status = await this.getAdminStatus(username);
    return status === '已禁用';
  }

  async getAdminRoles(username: string): Promise<string[]> {
    const tags = this.adminTableRows
      .filter({ hasText: username })
      .locator('.ant-tag')
      .all();
    return Promise.all(tags.map((t) => t.textContent() ?? ''));
  }

  async isAdminVisible(username: string): Promise<boolean> {
    const row = this.adminTableRows.filter({ hasText: username });
    return row.isVisible();
  }

  // ==================== Admin Pagination ====================

  async navigateToAdminPage(page: number) {
    const jumper = this.page.locator('.ant-pagination-options- jumper input');
    await jumper.fill(String(page));
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async changeAdminPageSize(size: number) {
    await this.adminPageSizeChanger.click();
    await this.page.waitForTimeout(500);
    await this.page.locator(`.ant-select-item-option`).filter({ hasText: String(size) }).click();
    await this.page.waitForTimeout(1000);
  }

  async nextAdminPage() {
    await this.adminPageNextButton.click();
    await this.page.waitForTimeout(1000);
  }

  async prevAdminPage() {
    await this.adminPagePrevButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getAdminTotalCount(): Promise<number> {
    const text = await this.adminTotalText.textContent();
    const match = text?.match(/共 (\d+) 条/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getAdminRowCount(): Promise<number> {
    return this.adminTableRows.count();
  }

  // ==================== Operation Log Tab ====================

  async searchLogs(operator?: string, actionType?: string, dateRange?: [string, string]) {
    if (operator) {
      await this.logOperatorInput.fill(operator);
    }
    if (actionType) {
      await this.logActionTypeSelect.click();
      await this.logActionTypeOption(actionType).click();
      await this.page.waitForTimeout(300);
    }
    if (dateRange) {
      await this.logDateRangePicker.click();
      await this.page.locator('.ant-picker-input input').first().fill(dateRange[0]);
      await this.page.locator('.ant-picker-input input').last().fill(dateRange[1]);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(300);
    }
    await this.logSearchButton.click();
    await this.page.waitForTimeout(1500);
  }

  async resetLogFilters() {
    await this.logResetButton.click();
    await this.page.waitForTimeout(1500);
  }

  async refreshLogs() {
    await this.logRefreshButton.click();
    await this.page.waitForTimeout(1500);
  }

  async getLogOperatorNames(): Promise<string[]> {
    const cells = this.logTableRows.locator('td').nth(0).all();
    return Promise.all(cells.map((c) => c.textContent() ?? ''));
  }

  async getLogRowCount(): Promise<number> {
    return this.logTableRows.count();
  }

  async isLogVisible(operator: string): Promise<boolean> {
    const row = this.logTableRows.filter({ hasText: operator });
    return row.isVisible();
  }

  async getLogDescription(operator: string): Promise<string> {
    const cell = this.logDescriptionCell(operator);
    await cell.waitFor({ state: 'visible', timeout: 5000 });
    return cell.textContent() ?? '';
  }

  async getLogActionType(operator: string): Promise<string> {
    const tag = this.logActionTag(operator);
    await tag.waitFor({ state: 'visible', timeout: 5000 });
    return tag.textContent() ?? '';
  }

  async nextLogPage() {
    await this.logPageNextButton.click();
    await this.page.waitForTimeout(1000);
  }

  async prevLogPage() {
    await this.logPagePrevButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getLogTotalCount(): Promise<number> {
    const text = await this.logTotalText.textContent();
    const match = text?.match(/共 (\d+) 条/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ==================== Modal Helpers ====================

  async closeModal() {
    // Click the modal's close (X) button — Escape doesn't work on controlled Ant Design modals
    await this.page.locator('.ant-modal-close').click();
    await this.page.waitForTimeout(1000);
  }

  async closeModalViaCancel() {
    // Click the modal's close (X) button — more reliable than keyboard Escape for antd modals
    await this.page.locator('.ant-modal-close').click();
    await this.page.waitForTimeout(1000);
  }

  // ==================== Legacy / Backward-Compat Methods (for SM tests) ====================

  async clickCreateAdmin() {
    await this.openCreateAdminModal();
  }

  async submitCreateAdmin() {
    await this.submitAdminForm();
  }

  async fillCreateAdminFormNoRoles(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
  }) {
    await this.fillCreateAdminForm({
      username: data.username,
      phone: data.phone,
      password: data.password,
      email: data.email,
    });
  }

  async clickEditAdminByUsername(username: string) {
    await this.openEditAdminModal(username);
  }

  async submitEditAdmin() {
    await this.submitAdminForm();
  }

  async clickDeleteAdminByUsername(username: string) {
    await this.deleteAdmin(username);
  }

  async confirmDeleteAdmin() {
    await this.confirmDelete();
  }

  async searchAdminByUsername(username: string) {
    // Admin search uses the form's inline filter - find input and button
    await this.page.locator('input[placeholder="搜索用户名"]').fill(username);
    await this.page.locator('button').filter({ hasText: '查询' }).click();
    await this.page.waitForTimeout(1000);
  }

  async resetAdminSearch() {
    await this.page.locator('button').filter({ hasText: '重置' }).click();
    await this.page.waitForTimeout(1000);
  }

  async searchOperator(operator: string) {
    await this.logOperatorInput.fill(operator);
    await this.logSearchButton.click();
    await this.page.waitForTimeout(1000);
  }

  async clickReset() {
    await this.resetLogFilters();
  }

  async clickRefresh() {
    await this.refreshLogs();
  }

  async waitForModalGone() {
    // Use waitFor with state 'hidden' for antd modals (antd adds hidden attribute when closed)
    await this.page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 10000 });
  }

  async waitForPopconfirmGone() {
    await this.page.locator('.ant-popover').waitFor({ state: 'hidden', timeout: 5000 });
  }

  // ==================== Toast / Message Helpers ====================

  async getSuccessMessage(): Promise<string> {
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 3000 });
    return this.page.locator('.ant-message').textContent() ?? '';
  }

  async getErrorMessage(): Promise<string> {
    await this.page.locator('.ant-message-error').waitFor({ state: 'visible', timeout: 3000 });
    return this.page.locator('.ant-message-error').textContent() ?? '';
  }

  // ==================== Assertion Helpers ====================

  async assertAdminTableVisible() {
    await expect(this.adminTable).toBeVisible();
  }

  async assertLogTableVisible() {
    await expect(this.logTable).toBeVisible();
  }

  async assertModalVisible() {
    await expect(this.modal).toBeVisible();
  }

  async assertModalTitle(title: string) {
    const modalTitle = this.page.locator('.ant-modal-title');
    await expect(modalTitle).HaveText(title);
  }

  async assertAdminNotVisible(username: string) {
    const row = this.adminTableRows.filter({ hasText: username });
    await expect(row).not.toBeVisible();
  }

  async assertAdminVisible(username: string) {
    const row = this.adminTableRows.filter({ hasText: username });
    await expect(row).toBeVisible();
  }

  async assertRoleTagVisible(username: string, roleText: string) {
    await expect(this.roleTag(username, roleText)).toBeVisible();
  }

  async assertStatusTag(username: string, expectedStatus: '正常' | '已禁用') {
    const tag = this.statusTag(username);
    await expect(tag).toHaveText(expectedStatus);
  }
}
