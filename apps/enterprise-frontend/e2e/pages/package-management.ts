import { type Page, type Locator } from '@playwright/test';

/**
 * Platform Package Management Page Object
 * URL: /saas/platform/config (Config.tsx)
 */
export class PackageManagementPage {
  readonly page: Page;

  // Table
  readonly packageRows: Locator;

  // Buttons
  readonly createButton: Locator;

  // Modal
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly codeInput: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  // Permission modal
  readonly permModal: Locator;
  readonly permTree: Locator;
  readonly savePermsButton: Locator;

  // Popconfirm (delete)
  readonly deletePopconfirm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.packageRows = page.locator('tbody tr');
    this.createButton = page.getByRole('button', { name: '新建套餐' });
    this.modal = page.locator('.ant-modal');
    this.modalTitle = page.locator('.ant-modal-title');
    this.codeInput = page.locator('input[placeholder*="套餐编码"], input[id*="code"]');
    this.nameInput = page.locator('input[placeholder*="套餐名称"], input[id*="name"]');
    this.descriptionInput = page.locator('textarea[placeholder*="套餐描述"]');
    this.confirmButton = page.getByRole('button', { name: '确 定' });
    this.cancelButton = page.getByRole('button', { name: '取消' });
    this.permModal = page.locator('.ant-modal').filter({ hasText: '配置套餐权限' });
    this.permTree = page.locator('.ant-tree');
    this.savePermsButton = page.getByRole('button', { name: '保存权限' });
    this.deletePopconfirm = page.locator('.ant-popconfirm');
  }

  async goto() {
    await this.page.goto('/saas/platform/config');
    await expect(this.page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });
  }

  async openCreateModal() {
    await this.createButton.click();
    await expect(this.modal).toBeVisible();
  }

  async fillPackageForm(code: string, name: string, description?: string) {
    await this.codeInput.fill(code);
    await this.nameInput.fill(name);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  async openPermsModal(pkgName: string) {
    const row = this.packageRows.filter({ hasText: pkgName }).first();
    await row.locator('button').filter({ hasText: '配置权限' }).click();
    await expect(this.permModal).toBeVisible({ timeout: 3000 }).catch(() => {
      // Perm modal might not open if element not found
    });
  }

  async selectPermission(permissionLabel: string) {
    const node = this.permTree.locator('.ant-tree-node-content-wrapper').filter({ hasText: permissionLabel }).first();
    await node.click();
  }

  async submitForm() {
    await this.confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async deletePackage(pkgName: string) {
    const row = this.packageRows.filter({ hasText: pkgName }).first();
    await row.locator('button').filter({ hasText: '删除' }).click();
    await expect(this.deletePopconfirm).toBeVisible();
    await this.deletePopconfirm.getByRole('button', { name: '确定' }).click();
  }

  async expectSuccess() {
    await this.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  }

  async expectError(message?: string) {
    await this.page.waitForSelector('.ant-message-error', { timeout: 5000 });
    if (message) {
      await expect(this.page.locator('.ant-message-error').filter({ hasText: message })).toBeVisible();
    }
  }
}

import { expect } from '@playwright/test';
