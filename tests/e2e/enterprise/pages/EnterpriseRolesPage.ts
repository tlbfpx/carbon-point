import { Page, Locator } from '@playwright/test';

/**
 * Enterprise Roles Management Page Object
 * Maps to: saas-frontend/enterprise-frontend/src/pages/Roles.tsx
 */
export class EnterpriseRolesPage {
  private page: Page;

  // Page header
  private pageTitle: Locator;
  private pageDescription: Locator;
  private addRoleButton: Locator;

  // Table
  private dataTable: Locator;
  private tableRows: Locator;
  private emptyState: Locator;

  // Role type tags
  private superAdminTag: Locator;
  private operatorTag: Locator;
  private customTag: Locator;

  // Action buttons
  private viewPermissionButton: Locator;
  private editButton: Locator;
  private deleteButton: Locator;

  // Modal
  private modal: Locator;
  private modalTitle: Locator;
  private roleNameInput: Locator;
  private roleDescriptionInput: Locator;
  private permTree: Locator;
  private confirmButton: Locator;
  private cancelButton: Locator;
  private closeButton: Locator;

  // Create modal
  private createModalTitle: Locator;
  private savePermissionsButton: Locator;

  // Pagination
  private pagination: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header
    this.pageTitle = page.locator('h1:has-text("角色管理")').first();
    this.pageDescription = page.locator('text=管理系统角色');
    this.addRoleButton = page.locator('button:has-text("添加角色")').first();

    // Table - Ant Design Card + Table
    this.dataTable = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-row');
    this.emptyState = page.locator('.ant-empty');

    // Role type tags
    this.superAdminTag = page.locator('text=超管').first();
    this.operatorTag = page.locator('text=运营').first();
    this.customTag = page.locator('text=自定义').first();

    // Action buttons in table rows
    this.viewPermissionButton = page.locator('button:has-text("查看权限")').first();
    this.editButton = page.locator('button:has-text("编辑")').first();
    this.deleteButton = page.locator('button:has-text("删除")').first();

    // Modal
    this.modal = page.locator('.ant-modal');
    this.modalTitle = page.locator('.ant-modal-title, .ant-modal-header > *').first();
    this.roleNameInput = page.locator('.ant-modal input[placeholder*="数据分析"], .ant-modal input#name');
    this.roleDescriptionInput = page.locator('.ant-modal textarea');
    this.permTree = page.locator('.ant-tree');
    this.confirmButton = page.locator('.ant-modal button:has-text("确定")').first();
    this.cancelButton = page.locator('.ant-modal button:has-text("取消")').first();
    this.closeButton = page.locator('.ant-modal button[aria-label="Close"]');

    // Save permissions (edit mode)
    this.savePermissionsButton = page.locator('.ant-modal button:has-text("保存权限")').first();

    // Pagination
    this.pagination = page.locator('.ant-pagination');
  }

  async goto(): Promise<void> {
    await this.page.goto('/roles', { waitUntil: 'networkidle' });
  }

  /**
   * Wait for table to load
   */
  async waitForTableLoad(): Promise<void> {
    await this.page.waitForSelector('.ant-table-row, .ant-empty', { timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if page title is visible
   */
  async isPageTitleVisible(): Promise<boolean> {
    return this.pageTitle.isVisible().catch(() => false);
  }

  /**
   * Open create role modal
   */
  async openCreateModal(): Promise<void> {
    await this.addRoleButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  /**
   * Fill create role form
   */
  async fillCreateRoleForm(name: string, description?: string): Promise<void> {
    await this.roleNameInput.fill(name);
    if (description) {
      await this.roleDescriptionInput.fill(description);
    }
  }

  /**
   * Submit create role form
   */
  async submitCreateRole(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Close modal
   */
  async closeModal(): Promise<void> {
    await this.cancelButton.click().catch(async () => {
      // Try close button if cancel not found
      await this.closeButton.click();
    });
    await this.page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Click view permissions on first row
   */
  async clickViewPermissionsFirst(): Promise<void> {
    await this.viewPermissionButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  /**
   * Click edit on first custom role
   */
  async clickEditFirstCustomRole(): Promise<void> {
    await this.editButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  /**
   * Click delete on first custom role
   */
  async clickDeleteFirstCustomRole(): Promise<void> {
    await this.deleteButton.click();
    // Popconfirm appears
    await this.page.locator('.ant-popconfirm .ant-btn-primary').click();
  }

  /**
   * Toggle a permission checkbox in the tree
   */
  async togglePermission(permLabel: string): Promise<void> {
    const permNode = this.page.locator(`.ant-tree-title:has-text("${permLabel}")`).first();
    const checkbox = permNode.locator('..').locator('.ant-tree-checkbox').first();
    await checkbox.click();
  }

  /**
   * Save permissions (edit mode)
   */
  async savePermissions(): Promise<void> {
    await this.savePermissionsButton.click();
  }

  /**
   * Get total number of rows
   */
  async getRowCount(): Promise<number> {
    if (await this.emptyState.isVisible().catch(() => false)) {
      return 0;
    }
    return this.tableRows.count();
  }

  /**
   * Check if table is visible
   */
  async isTableVisible(): Promise<boolean> {
    return this.dataTable.isVisible().catch(() => false);
  }

  /**
   * Check if modal is open
   */
  async isModalOpen(): Promise<boolean> {
    return this.modal.isVisible().catch(() => false);
  }

  /**
   * Get modal title text
   */
  async getModalTitle(): Promise<string> {
    return this.modalTitle.textContent().catch(() => '');
  }

  /**
   * Check if permission tree is visible in modal
   */
  async isPermissionTreeVisible(): Promise<boolean> {
    return this.permTree.isVisible().catch(() => false);
  }

  /**
   * Get role names from table
   */
  async getRoleNames(): Promise<string[]> {
    const cells = await this.page.locator('.ant-table-row td:nth-child(1)').all();
    const names: string[] = [];
    for (const cell of cells) {
      names.push(await cell.textContent() || '');
    }
    return names;
  }

  /**
   * Check if add role button is visible
   */
  async isAddRoleButtonVisible(): Promise<boolean> {
    return this.addRoleButton.isVisible().catch(() => false);
  }

  /**
   * Get toast message
   */
  async getToastMessage(): Promise<string> {
    const toast = await this.page.locator('.ant-message').textContent().catch(() => '');
    return toast || '';
  }

  /**
   * Get form validation error
   */
  async getFormValidationError(): Promise<string> {
    const error = await this.page.locator('.ant-form-item-explain-error').first().textContent().catch(() => '');
    return error;
  }

  /**
   * Check if popconfirm is visible
   */
  async isPopconfirmVisible(): Promise<boolean> {
    return this.page.locator('.ant-popconfirm').isVisible().catch(() => false);
  }

  /**
   * Cancel the popconfirm
   */
  async cancelPopconfirm(): Promise<void> {
    await this.page.locator('.ant-popconfirm .ant-btn:not(.ant-btn-primary)').click();
  }

  /**
   * Get page URL
   */
  async getUrl(): Promise<string> {
    return this.page.url();
  }
}
