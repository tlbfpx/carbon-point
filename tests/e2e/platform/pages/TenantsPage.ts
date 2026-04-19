import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class TenantManagementPage {
  readonly page: Page;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly refreshButton: Locator;
  readonly addButton: Locator;
  readonly modal: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.searchInput = page.locator('.ant-input-search input');
    this.statusFilter = page.locator('.ant-select').filter({ hasText: '' }).first();
    this.refreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.addButton = page.locator('button').filter({ hasText: '开通企业' });
    this.modal = page.locator('.ant-modal');
    this.pagination = page.locator('.ant-pagination');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/platform/enterprises');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async getTableRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async getEnterpriseNames(): Promise<string[]> {
    const count = await this.tableRows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const cell = this.tableRows.nth(i).locator('td').first();
      names.push((await cell.textContent()) || '');
    }
    return names;
  }

  async searchByName(keyword: string): Promise<void> {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  async clearSearch(): Promise<void> {
    const clearBtn = this.page.locator('.ant-input-search .ant-input-clear-icon');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByStatus(status: 'active' | 'inactive'): Promise<void> {
    const label = status === 'active' ? '正常' : '停用';
    await this.statusFilter.click();
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: label }).click();
    await this.page.waitForTimeout(1500);
  }

  async clearStatusFilter(): Promise<void> {
    const clearBtn = this.page.locator('.ant-select-clear');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async openCreateModal(): Promise<void> {
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: {
    name: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
  }): Promise<void> {
    const inputs = this.modal.locator('.ant-input input, .ant-input').nth(0);
    // Use form field approach
    const formItems = this.modal.locator('.ant-form-item');
    const nameInput = formItems.nth(0).locator('input');
    const contactInput = formItems.nth(1).locator('input');
    const phoneInput = formItems.nth(2).locator('input');
    const emailInput = formItems.nth(3).locator('input');

    await nameInput.fill(data.name);
    await contactInput.fill(data.contactName);
    await phoneInput.fill(data.contactPhone);
    if (data.contactEmail) {
      await emailInput.fill(data.contactEmail);
    }
  }

  async submitCreateForm(): Promise<void> {
    await this.modal.locator('button[type="submit"]').filter({ hasText: '确认开通' }).click();
    await this.page.waitForTimeout(2000);
  }

  async cancelCreateForm(): Promise<void> {
    await this.modal.locator('button').filter({ hasText: '取消' }).click();
    await this.page.waitForTimeout(500);
  }

  async closeModal(): Promise<void> {
    const closeBtn = this.modal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  async clickDetailButton(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    const detailBtn = row.locator('button').filter({ hasText: '详情' });
    await detailBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickStatusToggleButton(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    // Status toggle: "停用" if active, "开通" if inactive
    const toggleBtn = row.locator('button').filter({ hasText: /^停用$|^开通$/ });
    await toggleBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async confirmStatusToggle(): Promise<void> {
    const confirmBtn = this.page.locator('.ant-popover .ant-btn-primary');
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }

  async getStatusTag(rowIndex: number): Promise<string> {
    const row = this.tableRows.nth(rowIndex);
    // Last ant-tag in the row is the status column
    const tags = row.locator('.ant-tag');
    const count = await tags.count();
    if (count > 0) {
      return (await tags.last().textContent()) || '';
    }
    return '';
  }

  async getRowButtons(rowIndex: number): Promise<string[]> {
    const row = this.tableRows.nth(rowIndex);
    const buttons = row.locator('button');
    const count = await buttons.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push((await buttons.nth(i).textContent()) || '');
    }
    return texts;
  }

  async hasEmptyState(): Promise<boolean> {
    try {
      return await this.page.locator('.ant-table-placeholder').isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  async clickNextPage(): Promise<void> {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    const isDisabled = await nextBtn.getAttribute('aria-disabled');
    if (isDisabled !== 'true') {
      await nextBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async clickPrevPage(): Promise<void> {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    const isDisabled = await prevBtn.getAttribute('aria-disabled');
    if (isDisabled !== 'true') {
      await prevBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async getPaginationTotal(): Promise<number> {
    const totalText = this.pagination.locator('.ant-pagination-total-text');
    const text = await totalText.textContent();
    const match = text?.match(/共\s*(\d+)\s*条/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
