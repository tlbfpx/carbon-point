import { type Page, type Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Enterprise Role Management Page Object
 * URL: /dashboard/enterprise/roles (Roles.tsx - final implementation)
 *
 * Features:
 * - Role list with 3 role types as color-coded tags
 * - Super admin: "查看权限" (view-only) button
 * - Operator/custom: "编辑权限" + "删除" buttons
 * - Modal with 3 modes: view, edit, create
 */
export class RoleManagementPage {
  readonly page: Page;

  // Table
  readonly roleRows: Locator;

  // Buttons
  readonly createRoleButton: Locator;

  // Modal
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly permTree: Locator;
  readonly submitButton: Locator;

  // Role type specific rows
  readonly superAdminRow: Locator;
  readonly operatorRow: Locator;
  readonly customRow: Locator;

  // Delete confirmation
  readonly deleteConfirmPopconfirm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roleRows = page.locator('tbody tr');
    this.createRoleButton = page.getByRole('button', { name: '新增自定义角色' });
    this.modal = page.locator('.ant-modal');
    this.modalTitle = page.locator('.ant-modal-title');
    this.nameInput = page.locator('input[placeholder*="数据分析专员"], input[id*="name"]');
    this.descriptionInput = page.locator('textarea[placeholder*="说明"]');
    this.permTree = page.locator('.ant-tree');
    this.submitButton = page.getByRole('button', { name: '确 定' });
    this.superAdminRow = page.locator('.ant-table-tbody tr').filter({
      has: page.locator('.ant-tag').filter({ hasText: '超管' }),
    });
    this.operatorRow = page.locator('.ant-table-tbody tr').filter({
      has: page.locator('.ant-tag').filter({ hasText: '运营' }),
    });
    this.customRow = page.locator('.ant-table-tbody tr').filter({
      has: page.locator('.ant-tag').filter({ hasText: '自定义' }),
    });
    this.deleteConfirmPopconfirm = page.locator('.ant-popconfirm');
  }

  async goto() {
    await this.page.goto('/dashboard/enterprise/roles');
    await expect(this.page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });
  }

  async openCreateModal() {
    await this.createRoleButton.click();
    await expect(this.modal).toBeVisible();
  }

  async fillRoleForm(name: string, description?: string) {
    await this.nameInput.fill(name);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  async selectPermission(permissionLabel: string) {
    const node = this.permTree.locator('.ant-tree-node-content-wrapper').filter({ hasText: permissionLabel }).first();
    await node.click();
  }

  async selectPermissions(permissions: string[]) {
    for (const perm of permissions) {
      await this.selectPermission(perm);
    }
  }

  async submitForm() {
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async viewRolePermissions(roleName: string) {
    const row = this.roleRows.filter({ hasText: roleName });
    const viewBtn = row.locator('button').filter({ hasText: '查看权限' });
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(this.modal).toBeVisible();
    }
  }

  async editRolePermissions(roleName: string) {
    const row = this.roleRows.filter({ hasText: roleName });
    const editBtn = row.locator('button').filter({ hasText: '编辑权限' });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(this.modal).toBeVisible();
    }
  }

  async savePermissions() {
    await this.page.locator('.ant-modal button').filter({ hasText: '保存权限' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteRole(roleName: string) {
    const row = this.roleRows.filter({ hasText: roleName });
    const deleteBtn = row.locator('button').filter({ hasText: '删除' });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(this.deleteConfirmPopconfirm).toBeVisible();
      await this.deleteConfirmPopconfirm.getByRole('button', { name: '确定' }).click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async closeModal() {
    await this.page.locator('.ant-modal button').filter({ hasText: '关闭' }).click().catch(() => {
      // Try cancel button if close not found
      this.page.locator('.ant-modal button').filter({ hasText: '取消' }).click();
    });
  }

  async expectSuccess() {
    await this.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  }

  async expectError() {
    await this.page.waitForSelector('.ant-message-error', { timeout: 5000 });
  }

  async expectModalTitle(title: string) {
    await expect(this.modalTitle).toContainText(title);
  }

  async expectSuperAdminReadOnly() {
    // Super admin row should have "查看权限" but NOT "编辑权限" or "删除"
    const viewBtn = this.superAdminRow.locator('button').filter({ hasText: '查看权限' });
    const editBtn = this.superAdminRow.locator('button').filter({ hasText: '编辑权限' });
    const deleteBtn = this.superAdminRow.locator('button').filter({ hasText: '删除' });
    await expect(viewBtn).toBeVisible();
    await expect(editBtn).not.toBeVisible();
    await expect(deleteBtn).not.toBeVisible();
  }
}
