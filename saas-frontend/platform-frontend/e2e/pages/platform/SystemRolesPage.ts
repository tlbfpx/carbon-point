import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class SystemRolesPage {
  readonly page: Page;

  // Table & Layout
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly pageTitle: Locator;
  readonly createButton: Locator;

  // Modal
  readonly modal: Locator;
  readonly modalCodeInput: Locator;
  readonly modalNameInput: Locator;
  readonly modalDescInput: Locator;
  readonly modalSubmitButton: Locator;

  // Permission modal (separate from create/edit modal)
  readonly permModal: Locator;
  readonly permTree: Locator;

  // Per-row locators
  readonly editButton: (roleName: string) => Locator;
  readonly permButton: (roleName: string) => Locator;
  readonly deleteButton: (roleName: string) => Locator;
  readonly statusTag: (roleName: string) => Locator;

  // Pagination
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.pageTitle = page.locator('h2').filter({ hasText: '角色管理' });
    this.createButton = page.locator('button').filter({ hasText: '新增角色' });

    this.modal = page.locator('.ant-modal');
    this.modalCodeInput = page.locator('.ant-modal input[placeholder*="角色编码"]');
    this.modalNameInput = page.locator('.ant-modal input[placeholder*="角色名称"]');
    this.modalDescInput = page.locator('.ant-modal textarea');
    this.modalSubmitButton = page.locator('.ant-modal button[type="submit"]');

    this.permModal = page.locator('.ant-modal').filter({ hasText: '配置权限' });
    this.permTree = page.locator('.ant-tree');

    this.editButton = (roleName: string) =>
      this.tableRows.filter({ hasText: roleName }).locator('button').filter({ hasText: '编辑' });
    this.permButton = (roleName: string) =>
      this.tableRows.filter({ hasText: roleName }).locator('button').filter({ hasText: '配置权限' });
    this.deleteButton = (roleName: string) =>
      this.tableRows.filter({ hasText: roleName }).locator('.ant-btn-dangerous');
    this.statusTag = (roleName: string) =>
      this.tableRows.filter({ hasText: roleName }).locator('.ant-tag');

    this.pagination = page.locator('.ant-pagination');
  }

  // ==================== Navigation ====================

  async goto() {
    await this.page.evaluate((path: string) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `${BASE_URL}/system/roles`);
    await this.page.waitForURL('**/system/roles', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('h2:has-text("角色管理")', { timeout: 15000 });
  }

  // ==================== Role CRUD ====================

  async openCreateModal() {
    await this.createButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: { code: string; name: string; description?: string }) {
    await this.modalCodeInput.fill(data.code);
    await this.modalNameInput.fill(data.name);
    if (data.description) {
      await this.modalDescInput.fill(data.description);
    }
  }

  async submitForm() {
    await this.modalSubmitButton.click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async createRole(data: { code: string; name: string; description?: string }) {
    await this.openCreateModal();
    await this.fillCreateForm(data);
    await this.submitForm();
  }

  async openEditModal(roleName: string) {
    await this.tableRows.filter({ hasText: roleName }).waitFor({ state: 'visible', timeout: 10000 });
    await this.editButton(roleName).click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillEditForm(data: { name?: string; description?: string }) {
    if (data.name) {
      await this.modalNameInput.clear();
      await this.modalNameInput.fill(data.name);
    }
    if (data.description) {
      await this.modalDescInput.clear();
      await this.modalDescInput.fill(data.description);
    }
  }

  async openPermModal(roleName: string) {
    await this.tableRows.filter({ hasText: roleName }).waitFor({ state: 'visible', timeout: 10000 });
    await this.permButton(roleName).click();
    await this.permModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async savePermissions() {
    await this.permModal.locator('.ant-btn-primary').filter({ hasText: '确 定' }).click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async deleteRole(roleName: string) {
    await this.tableRows.filter({ hasText: roleName }).waitFor({ state: 'visible', timeout: 10000 });
    await this.deleteButton(roleName).click();
    await this.page.locator('.ant-popconfirm').waitFor({ state: 'visible', timeout: 5000 });
  }

  async confirmDelete() {
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

  async assertRoleVisible(roleName: string) {
    await expect(this.tableRows.filter({ hasText: roleName })).toBeVisible({ timeout: 15000 });
  }

  async assertRoleNotVisible(roleName: string) {
    await expect(this.tableRows.filter({ hasText: roleName })).not.toBeVisible();
  }

  async assertModalVisible() {
    await expect(this.modal).toBeVisible();
  }

  async assertSuccessMessage() {
    const msg = this.page.locator('.ant-message');
    await msg.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async getStatus(roleName: string): Promise<string> {
    const tag = this.statusTag(roleName);
    await tag.waitFor({ state: 'visible', timeout: 5000 });
    return tag.textContent() ?? '';
  }
}
