import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class EnterpriseManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly pagination: Locator;
  readonly exportButton: Locator;
  readonly detailModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '开通企业' });
    // The search is an input inside .ant-input-search wrapper
    this.searchInput = page.locator('.ant-input-search input');
    this.table = page.locator('.ant-table');
    this.pagination = page.locator('.ant-pagination');
    // Export may be in a dropdown or not present on this page
    this.exportButton = page.locator('button').filter({ hasText: '导出' });
    this.detailModal = page.locator('.ant-modal');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/enterprises`);
    await this.page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  async clickAddEnterprise() {
    await this.addButton.click();
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async fillEnterpriseForm(name: string, contactName: string, contactPhone: string) {
    const modal = this.page.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(name);
    await inputs.nth(1).fill(contactName);
    await inputs.nth(2).fill(contactPhone);
  }

  async selectPackage(packageName: string) {
    const modal = this.page.locator('.ant-modal');
    const selects = modal.locator('.ant-select');
    if (await selects.count() > 0) {
      await selects.first().click();
      try {
        await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
        const option = this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: packageName }).first();
        if (await option.isVisible().catch(() => false)) {
          await option.click();
        }
      } catch {
        // Package option not found - skip selection
      }
    }
  }

  async submitEnterprise() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确认开通' }).click();
  }

  async searchEnterprise(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  async clearSearch() {
    const clearBtn = this.page.locator('.ant-input-search .ant-input-clear-icon');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getTableRowCount(): Promise<number> {
    const rows = this.table.locator('.ant-table-tbody tr');
    return rows.count();
  }

  async getTableHeaders(): Promise<string[]> {
    const headers = this.table.locator('.ant-table-thead th');
    const count = await headers.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(await headers.nth(i).textContent() || '');
    }
    return texts;
  }

  async getEnterpriseNames(): Promise<string[]> {
    const rows = this.table.locator('.ant-table-tbody tr');
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const cell = rows.nth(i).locator('td').first();
      names.push(await cell.textContent() || '');
    }
    return names;
  }

  async clickActionButton(rowIndex: number, buttonText: string) {
    const rows = this.table.locator('.ant-table-tbody tr');
    const row = rows.nth(rowIndex);
    const button = row.locator('button').filter({ hasText: buttonText });
    if (await button.isVisible()) {
      await button.click();
    }
  }

  async openEnterpriseDetail(rowIndex: number) {
    await this.clickActionButton(rowIndex, '详情');
    // Wait for modal to appear, with retry if button wasn't clickable
    try {
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    } catch {
      // Try clicking the button again if modal didn't appear
      const rows = this.table.locator('.ant-table-tbody tr');
      const row = rows.nth(rowIndex);
      const button = row.locator('button').filter({ hasText: '详情' });
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
      }
    }
  }

  async openEnterpriseSettings(rowIndex: number) {
    await this.clickActionButton(rowIndex, '设置');
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  async toggleStatus(rowIndex: number) {
    const rows = this.table.locator('.ant-table-tbody tr');
    const row = rows.nth(rowIndex);
    const statusBtn = row.locator('button').filter({ hasText: '停用' })
      .or(row.locator('button').filter({ hasText: '开通' }));
    if (!(await statusBtn.isVisible().catch(() => false))) {
      throw new Error('Status toggle button not visible');
    }
    await statusBtn.click();
    try {
      await this.page.waitForSelector('.ant-popover', { timeout: 3000 });
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).click();
    } catch {
      // Popover confirm not found - button click may have been sufficient
    }
    await this.page.waitForTimeout(500);
  }

  async clickNextPage() {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    const isDisabled = await nextBtn.getAttribute('aria-disabled');
    if (isDisabled !== 'true') {
      await nextBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async clickPrevPage() {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    const isDisabled = await prevBtn.getAttribute('aria-disabled');
    if (isDisabled !== 'true') {
      await prevBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async closeModal() {
    const closeBtn = this.detailModal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  // Get the status tag from a row (the last ant-tag, which is the status column)
  async getStatusBadge(rowIndex: number): Promise<string> {
    const rows = this.table.locator('.ant-table-tbody tr');
    const row = rows.nth(rowIndex);
    const tags = row.locator('.ant-tag');
    const count = await tags.count();
    if (count > 0) {
      return (await tags.last().textContent()) || '';
    }
    return '';
  }

  async getModalTextContent(): Promise<string> {
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    const modal = this.page.locator('.ant-modal');
    return (await modal.textContent()) || '';
  }

  async clickExport() {
    await this.exportButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getEmptyState(): Promise<Locator> {
    return this.table.locator('.ant-table-placeholder');
  }

  async getRowButtons(rowIndex: number): Promise<string[]> {
    const rows = this.table.locator('.ant-table-tbody tr');
    const row = rows.nth(rowIndex);
    const buttons = await row.locator('button').allTextContents();
    return buttons;
  }

  async getFirstPageEnterpriseName(): Promise<string> {
    const rows = this.table.locator('.ant-table-tbody tr');
    if (await rows.count() > 0) {
      return (await rows.first().locator('td').first().textContent()) || '';
    }
    return '';
  }

  async hasEmptyState(): Promise<boolean> {
    const placeholder = this.table.locator('.ant-table-placeholder');
    return placeholder.isVisible();
  }

  async cancelModal() {
    await this.page.locator('.ant-modal .ant-modal-close').click();
    await this.page.waitForTimeout(300);
  }

  async waitForModalVisible(timeout = 5000) {
    await this.page.waitForSelector('.ant-modal', { timeout });
  }
}
