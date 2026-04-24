import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class DictManagementPage {
  readonly page: Page;

  // Table & Layout
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly pageTitle: Locator;
  readonly createButton: Locator;

  // Modal
  readonly modal: Locator;
  readonly modalDictTypeInput: Locator;
  readonly modalDictCodeInput: Locator;
  readonly modalDictNameInput: Locator;
  readonly modalSortInput: Locator;
  readonly modalRemarkInput: Locator;
  readonly modalSubmitButton: Locator;

  // Per-row locators
  readonly editButton: (dictName: string) => Locator;
  readonly deleteButton: (dictName: string) => Locator;
  readonly statusTag: (dictName: string) => Locator;

  // Filter
  readonly typeFilterSelect: Locator;

  // Pagination
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.pageTitle = page.locator('h2').filter({ hasText: '字典管理' });
    this.createButton = page.locator('button').filter({ hasText: '新增字典' });

    this.modal = page.locator('.ant-modal');
    this.modalDictTypeInput = page.locator('.ant-modal input[placeholder*="字典类型"]');
    this.modalDictCodeInput = page.locator('.ant-modal input[placeholder*="字典编码"]');
    this.modalDictNameInput = page.locator('.ant-modal input[placeholder*="字典名称"]').first();
    this.modalSortInput = page.locator('.ant-modal .ant-input-number-input');
    this.modalRemarkInput = page.locator('.ant-modal textarea');
    this.modalSubmitButton = page.locator('.ant-modal button[type="submit"]');

    this.editButton = (dictName: string) =>
      this.tableRows.filter({ hasText: dictName }).locator('button').filter({ hasText: '编辑' });
    this.deleteButton = (dictName: string) =>
      this.tableRows.filter({ hasText: dictName }).locator('.ant-btn-dangerous');
    this.statusTag = (dictName: string) =>
      this.tableRows.filter({ hasText: dictName }).locator('.ant-tag');

    // The filter Select is the only .ant-select on the main page (not in modal)
    this.typeFilterSelect = page.locator('.ant-select').first();
    this.pagination = page.locator('.ant-pagination');
  }

  // ==================== Navigation ====================

  async goto() {
    await this.page.evaluate((path: string) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, `${BASE_URL}/system/dict`);
    await this.page.waitForURL('**/system/dict', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('h2:has-text("字典管理")', { timeout: 15000 });
  }

  // ==================== Dict CRUD ====================

  async openCreateModal() {
    await this.createButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: {
    dictType: string;
    dictCode: string;
    dictName: string;
    sortOrder?: number;
    remark?: string;
  }) {
    await this.modalDictTypeInput.fill(data.dictType);
    await this.modalDictCodeInput.fill(data.dictCode);
    await this.modalDictNameInput.fill(data.dictName);
    if (data.sortOrder !== undefined) {
      await this.modalSortInput.fill(String(data.sortOrder));
    }
    if (data.remark) {
      await this.modalRemarkInput.fill(data.remark);
    }
  }

  async submitForm() {
    await this.modalSubmitButton.click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 8000 });
  }

  async createDict(data: {
    dictType: string;
    dictCode: string;
    dictName: string;
    sortOrder?: number;
    remark?: string;
  }) {
    await this.openCreateModal();
    await this.fillCreateForm(data);
    await this.submitForm();
  }

  async openEditModal(dictName: string) {
    await this.tableRows.filter({ hasText: dictName }).waitFor({ state: 'visible', timeout: 10000 });
    await this.editButton(dictName).click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillEditForm(data: { dictName?: string; sortOrder?: number; remark?: string }) {
    if (data.dictName) {
      await this.modalDictNameInput.clear();
      await this.modalDictNameInput.fill(data.dictName);
    }
    if (data.sortOrder !== undefined) {
      await this.modalSortInput.clear();
      await this.modalSortInput.fill(String(data.sortOrder));
    }
    if (data.remark) {
      await this.modalRemarkInput.clear();
      await this.modalRemarkInput.fill(data.remark);
    }
  }

  async deleteDict(dictName: string) {
    await this.tableRows.filter({ hasText: dictName }).waitFor({ state: 'visible', timeout: 10000 });
    await this.deleteButton(dictName).click();
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

  async filterByType(dictType: string) {
    await this.typeFilterSelect.click();
    await this.page.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });
    await this.page.locator('.ant-select-item-option').filter({ hasText: dictType }).click();
    await this.page.waitForTimeout(500); // brief wait for data to refresh
    await this.table.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clearFilter() {
    const clearBtn = this.typeFilterSelect.locator('.ant-select-clear');
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    }
  }

  // ==================== Assertions ====================

  async assertDictVisible(dictName: string) {
    await expect(this.tableRows.filter({ hasText: dictName })).toBeVisible({ timeout: 15000 });
  }

  async assertDictNotVisible(dictName: string) {
    await expect(this.tableRows.filter({ hasText: dictName })).not.toBeVisible();
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
}
