import { Page, Locator } from '@playwright/test';

/**
 * Enterprise Member Management Page Object
 * Maps to: saas-frontend/enterprise-frontend/src/pages/Member.tsx
 */
export class EnterpriseMemberPage {
  private page: Page;

  // Page header
  private pageTitle: Locator;
  private pageDescription: Locator;

  // Action bar
  private searchInput: Locator;
  private addMemberButton: Locator;
  private batchImportButton: Locator;

  // Table
  private dataTable: Locator;
  private tableRows: Locator;
  private emptyState: Locator;

  // Add member modal
  private addMemberModal: Locator;
  private addMemberTitle: Locator;
  private memberPhoneInput: Locator;
  private memberNameInput: Locator;
  private confirmAddButton: Locator;
  private cancelButton: Locator;

  // Action buttons per row
  private inviteButton: Locator;
  private enableDisableButton: Locator;

  // Pagination
  private pagination: Locator;
  private paginationNext: Locator;
  private paginationPrev: Locator;

  // Popconfirm (for enable/disable)
  private popconfirmOk: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header
    this.pageTitle = page.locator('h1:has-text("成员管理")').first();
    this.pageDescription = page.locator('text=管理组织成员');

    // Action bar
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="姓名"], input[placeholder*="手机"]').first();
    this.addMemberButton = page.locator('button:has-text("添加成员")').first();
    this.batchImportButton = page.locator('button:has-text("批量导入")').first();

    // Table - Ant Design table
    this.dataTable = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-row');
    this.emptyState = page.locator('.ant-empty');

    // Add member modal
    this.addMemberModal = page.locator('.ant-modal-content');
    this.addMemberTitle = page.locator('h2:has-text("添加成员"), .ant-modal-title:has-text("添加成员")');
    this.memberPhoneInput = page.locator('.ant-modal input[placeholder*="手机号"]');
    this.memberNameInput = page.locator('.ant-modal input[placeholder*="姓名"]');
    this.confirmAddButton = page.locator('.ant-modal button:has-text("确定添加")').first();
    this.cancelButton = page.locator('.ant-modal button:has-text("取消")').first();

    // Row action buttons
    this.inviteButton = page.locator('button:has-text("邀请")').first();
    this.enableDisableButton = page.locator('button:has-text("停用"), button:has-text("启用")').first();

    // Pagination
    this.pagination = page.locator('.ant-pagination');
    this.paginationNext = page.locator('.ant-pagination-next a, .ant-pagination-item-link').last();
    this.paginationPrev = page.locator('.ant-pagination-prev');

    // Popconfirm
    this.popconfirmOk = page.locator('.ant-popconfirm .ant-btn-primary');
  }

  async goto(): Promise<void> {
    await this.page.goto('/members', { waitUntil: 'networkidle' });
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
   * Search for a member by keyword
   */
  async search(keyword: string): Promise<void> {
    await this.searchInput.fill(keyword);
    await this.searchInput.press('Enter');
    await this.waitForTableLoad();
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
    await this.waitForTableLoad();
  }

  /**
   * Open add member modal
   */
  async openAddMemberModal(): Promise<void> {
    await this.addMemberButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  /**
   * Fill add member form
   */
  async fillAddMemberForm(phone: string, name: string): Promise<void> {
    await this.memberPhoneInput.fill(phone);
    await this.memberNameInput.fill(name);
  }

  /**
   * Submit add member form
   */
  async submitAddMember(): Promise<void> {
    await this.confirmAddButton.click();
  }

  /**
   * Close add member modal
   */
  async closeAddMemberModal(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForSelector('.ant-modal', { state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Get total number of table rows
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
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible().catch(() => false);
  }

  /**
   * Check if add member modal is open
   */
  async isAddMemberModalOpen(): Promise<boolean> {
    return this.addMemberModal.isVisible().catch(() => false);
  }

  /**
   * Get all member names from table
   */
  async getMemberNames(): Promise<string[]> {
    const rows = await this.tableRows.all();
    const names: string[] = [];
    for (const row of rows) {
      const text = await row.textContent();
      names.push(text || '');
    }
    return names;
  }

  /**
   * Click invite button on first row
   */
  async clickInviteFirst(): Promise<void> {
    await this.inviteButton.click();
  }

  /**
   * Click enable/disable button on first row
   */
  async clickEnableDisableFirst(): Promise<void> {
    await this.enableDisableButton.click();
    // Popconfirm appears
    await this.popconfirmOk.click();
  }

  /**
   * Check if pagination is visible
   */
  async isPaginationVisible(): Promise<boolean> {
    return this.pagination.isVisible().catch(() => false);
  }

  /**
   * Go to next page
   */
  async goToNextPage(): Promise<void> {
    await this.paginationNext.click();
    await this.waitForTableLoad();
  }

  /**
   * Get Ant Design message text (success/error toast)
   */
  async getToastMessage(): Promise<string> {
    const toast = await this.page.locator('.ant-message').textContent().catch(() => '');
    return toast || '';
  }

  /**
   * Get validation error from modal
   */
  async getFormValidationError(): Promise<string> {
    const error = await this.page.locator('.ant-form-item-explain-error').first().textContent().catch(() => '');
    return error;
  }

  /**
   * Get page URL
   */
  async getUrl(): Promise<string> {
    return this.page.url();
  }
}
