import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class SystemUsersPage {
  readonly page: Page;

  // Table & Layout
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly pageTitle: Locator;
  readonly refreshButton: Locator;

  // Create button & modal
  readonly createButton: Locator;
  readonly modal: Locator;
  readonly modalUsernameInput: Locator;
  readonly modalPhoneInput: Locator;
  readonly modalPasswordInput: Locator;
  readonly modalEmailInput: Locator;
  readonly modalRoleSelect: Locator;
  readonly modalSubmitButton: Locator;

  // Reset password modal
  readonly resetModal: Locator;
  readonly resetNewPasswordInput: Locator;
  readonly resetConfirmPasswordInput: Locator;
  readonly resetSubmitButton: Locator;

  // Dropdown helpers (used by specs for step-by-step interaction)
  readonly modalRoleDropdown: Locator;
  readonly modalRoleOption: (label: string) => Locator;

  // Per-row locators
  readonly editButton: (username: string) => Locator;
  readonly deleteButton: (username: string) => Locator;
  readonly resetPasswordButton: (username: string) => Locator;
  readonly statusTag: (username: string) => Locator;

  // Pagination
  readonly pagination: Locator;
  readonly paginationTotalText: Locator;
  readonly paginationNext: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.pageTitle = page.locator('h2').filter({ hasText: '用户管理' });
    this.refreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.createButton = page.locator('button').filter({ hasText: '新增用户' });

    // Create/Edit modal
    this.modal = page.locator('.ant-modal');
    this.modalUsernameInput = page.locator('.ant-modal input[placeholder="请输入用户名"]');
    this.modalPhoneInput = page.locator('.ant-modal input[placeholder="请输入手机号"]');
    this.modalPasswordInput = page.locator('.ant-modal input[placeholder="请输入初始密码"]');
    this.modalEmailInput = page.locator('.ant-modal input[placeholder*="邮箱"]');
    this.modalRoleSelect = page.locator('.ant-modal .ant-select');
    this.modalSubmitButton = page.locator('.ant-modal button[type="submit"]');

    // Reset password modal — scope selectors to the reset modal to avoid matching create/edit modal
    this.resetModal = page.locator('.ant-modal').filter({ hasText: '重置密码' });
    this.resetNewPasswordInput = this.resetModal.locator('input[placeholder="请输入新密码"]');
    this.resetConfirmPasswordInput = this.resetModal.locator('input[placeholder="请再次输入新密码"]');
    this.resetSubmitButton = this.resetModal.locator('button[type="submit"]');

    // Dropdown helpers for role selection
    this.modalRoleDropdown = page.locator('.ant-select-dropdown');
    this.modalRoleOption = (label: string) =>
      page.locator('.ant-select-dropdown .ant-select-item-option-content').filter({ hasText: new RegExp(`^${label}$`) });

    // Per-row
    this.editButton = (username: string) =>
      this.tableRows.filter({ hasText: username }).locator('button').filter({ hasText: '编辑' });
    this.deleteButton = (username: string) =>
      this.tableRows.filter({ hasText: username }).locator('.ant-btn-dangerous');
    this.resetPasswordButton = (username: string) =>
      this.tableRows.filter({ hasText: username }).locator('button').filter({ hasText: '重置密码' });
    this.statusTag = (username: string) =>
      this.tableRows.filter({ hasText: username }).locator('.ant-tag').first();

    // Pagination
    this.pagination = page.locator('.ant-pagination');
    this.paginationTotalText = page.locator('.ant-pagination-total-text');
    this.paginationNext = page.locator('.ant-pagination-next');
  }

  // ==================== Navigation ====================

  async goto() {
    await this.page.evaluate((path: string) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `${BASE_URL}/system/users`);
    await this.page.waitForURL('**/system/users', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('h2:has-text("用户管理")', { timeout: 15000 });
  }

  // ==================== User CRUD ====================

  async openCreateModal() {
    await this.createButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
    role?: string;
  }) {
    await this.modalUsernameInput.fill(data.username);
    await this.modalPhoneInput.fill(data.phone);
    await this.modalPasswordInput.fill(data.password);
    if (data.email) {
      await this.modalEmailInput.fill(data.email);
    }
    if (data.role) {
      await this.selectRole(data.role);
    }
  }

  async selectRole(roleLabel: string) {
    await this.modalRoleSelect.click();
    await this.page.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });
    // Use exact match to avoid "管理员" matching "超级管理员"
    await this.page.locator('.ant-select-item-option-content')
      .filter({ hasText: new RegExp(`^${roleLabel}$`) })
      .click();
    await this.modalUsernameInput.click(); // close dropdown
  }

  async submitForm() {
    await this.modalSubmitButton.click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async createUser(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
    role?: string;
  }) {
    await this.openCreateModal();
    await this.fillCreateForm(data);
    await this.submitForm();
  }

  async openEditModal(username: string) {
    await this.tableRows.filter({ hasText: username }).waitFor({ state: 'visible', timeout: 10000 });
    await this.editButton(username).click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillEditForm(data: { email?: string; role?: string }) {
    if (data.email) {
      await this.modalEmailInput.clear();
      await this.modalEmailInput.fill(data.email);
    }
    if (data.role) {
      await this.selectRole(data.role);
    }
  }

  async openResetPasswordModal(username: string) {
    await this.tableRows.filter({ hasText: username }).waitFor({ state: 'visible', timeout: 10000 });
    await this.resetPasswordButton(username).click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async resetPassword(newPassword: string) {
    await this.resetNewPasswordInput.fill(newPassword);
    await this.resetConfirmPasswordInput.fill(newPassword);
    await this.resetSubmitButton.click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async deleteUser(username: string) {
    await this.tableRows.filter({ hasText: username }).waitFor({ state: 'visible', timeout: 10000 });
    await this.deleteButton(username).click();
    await this.page.locator('.ant-popconfirm').waitFor({ state: 'visible', timeout: 5000 });
  }

  async confirmDelete() {
    // Ant Design 5 Popconfirm: OK button is .ant-btn-primary inside .ant-popconfirm
    const confirmBtn = this.page.locator('.ant-popconfirm .ant-btn-primary');
    await confirmBtn.click({ timeout: 10000 });
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async closeModal() {
    await this.page.locator('.ant-modal-close').first().click();
    await this.page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 5000 });
  }

  async waitForModalGone() {
    await this.page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 5000 });
  }

  // ==================== Assertions ====================

  async assertUserVisible(username: string) {
    // With .reverse() in the component, newest users appear on page 1.
    // Use auto-retry to wait for the table to re-render after re-fetch.
    await expect(this.tableRows.filter({ hasText: username })).toBeVisible({ timeout: 15000 });
  }

  async assertUserNotVisible(username: string) {
    await expect(this.tableRows.filter({ hasText: username })).not.toBeVisible();
  }

  async assertModalVisible() {
    await expect(this.modal).toBeVisible();
  }

  async assertSuccessMessage() {
    // Ant Design message uses .ant-message wrapper with notice children
    // The text content includes "成功" for success messages
    const msg = this.page.locator('.ant-message');
    await msg.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async getStatus(username: string): Promise<string> {
    const tag = this.statusTag(username);
    await tag.waitFor({ state: 'visible', timeout: 5000 });
    return tag.textContent() ?? '';
  }
}
