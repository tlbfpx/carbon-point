import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class OrdersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly searchBtn: Locator;
  readonly statusFilter: Locator;
  readonly dateRangePicker: Locator;
  readonly productTypeFilter: Locator;
  readonly exportBtn: Locator;
  readonly table: Locator;
  readonly refreshBtn: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    // Look for any heading element containing '订单' text
    this.heading = page.locator('h1, h2, h3, .ant-typography, .page-title').filter({ hasText: '订单' }).first();
    // Search input - Ant Design search input typically has placeholder or is wrapped in ant-input-search
    this.searchInput = page.locator('.ant-input-search input').first().or(
      page.locator('input').filter({ hasText: '' }).first()
    );
    // Search button - find button near search input or with search-related text
    this.searchBtn = page.locator('.ant-input-search button').first().or(
      page.locator('button').filter({ hasText: /搜索|查询|筛/ }).first()
    );
    // Status filter - look for select that might be the status filter
    this.statusFilter = page.locator('.ant-select').filter({ hasText: /状态|待|完|取/ }).first().or(
      page.locator('.ant-select').first()
    );
    this.dateRangePicker = page.locator('.ant-picker-range').first();
    // Product type filter - might not exist on all pages
    this.productTypeFilter = page.locator('.ant-select').nth(1);
    // Export button - look for button with export text
    this.exportBtn = page.locator('button').filter({ hasText: /导出|Export/ }).first();
    this.table = page.locator('.ant-table').first();
    // Refresh button - might not have explicit text
    this.refreshBtn = page.locator('button').filter({ hasText: /刷新|Refresh/ }).first().or(
      page.locator('.ant-btn svg').first()
    );
    this.pagination = page.locator('.ant-pagination');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/orders`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.ant-table-tbody tr, .ant-empty', { timeout: 15000 });
  }

  async searchByKeyword(keyword: string) {
    // Use Enter key on search input instead of clicking search button
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async filterByStatus(status: string) {
    const statusFilter = this.page.locator('.ant-select').first();
    await statusFilter.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 5000 });
    // Try to find the option by text
    const option = this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: status });
    const optionCount = await option.count();
    if (optionCount > 0) {
      await option.first().click();
    } else {
      // Press Escape to close dropdown
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async filterByProductType(type: string) {
    const selectCount = await this.page.locator('.ant-select').count();
    if (selectCount < 2) {
      // Only one select, skip this filter
      return;
    }
    const productFilter = this.page.locator('.ant-select').nth(1);
    await productFilter.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 5000 });
    const option = this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: type });
    const optionCount = await option.count();
    if (optionCount > 0) {
      await option.first().click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async setDateRange(startDate: string, endDate: string) {
    await this.dateRangePicker.click();
    await this.page.waitForSelector('.ant-picker-panel', { timeout: 5000 });
    // Fill start date
    const inputs = this.page.locator('.ant-picker-input input');
    await inputs.first().fill(startDate);
    await this.page.waitForTimeout(200);
    // Fill end date
    await inputs.last().fill(endDate);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async exportOrders() {
    const exportBtn = this.page.locator('button').filter({ hasText: /导出|Export/ }).first();
    const isVisible = await exportBtn.isVisible().catch(() => false);
    if (isVisible) {
      await exportBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async refresh() {
    const refreshBtn = this.page.locator('button').filter({ hasText: /刷新|Refresh/ }).first();
    const isVisible = await refreshBtn.isVisible().catch(() => false);
    if (isVisible) {
      await refreshBtn.click();
    } else {
      // Try clicking the first button in the toolbar
      const toolbarBtn = this.page.locator('.ant-toolbar button').first();
      if (await toolbarBtn.isVisible().catch(() => false)) {
        await toolbarBtn.click();
      }
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getOrderCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }

  async clickOrderRow(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (rowIndex < count) {
      await rows.nth(rowIndex).click();
      await this.page.waitForTimeout(1000);
    }
  }

  async viewOrderDetails(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0 && rowIndex < count) {
      const row = rows.nth(rowIndex);
      // Try to find view button in the row
      const viewBtn = row.locator('button').filter({ hasText: /查看|详情/ });
      const isBtnVisible = await viewBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (isBtnVisible) {
        await viewBtn.click();
      } else {
        // Try clicking the row directly
        await row.click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async getOrderStatusBadge(rowIndex: number): Promise<string> {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0 && rowIndex < count) {
      const badge = rows.nth(rowIndex).locator('.ant-tag, [class*="status"]');
      if (await badge.count() > 0) {
        return await badge.first().textContent() || '';
      }
    }
    return '';
  }

  async sortByColumn(columnText: string, direction: 'ascend' | 'descend') {
    const header = this.table.locator('.ant-table-column-title').filter({ hasText: columnText });
    const headerCount = await header.count();
    if (headerCount === 0) {
      return;
    }
    await header.first().click();
    if (direction === 'ascend') {
      await header.first().click();
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async goToPage(pageNumber: number) {
    const pageItem = this.pagination.locator('.ant-pagination-item').filter({ hasText: String(pageNumber) });
    if (await pageItem.isVisible().catch(() => false)) {
      await pageItem.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async goToNextPage() {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    try {
      const isDisabled = await nextBtn.getAttribute('aria-disabled').catch(() => 'false');
      if (isDisabled === 'true') return;
      if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await nextBtn.click({ timeout: 5000 });
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
      }
    } catch {
      // Next page button not available or disabled - skip
    }
  }

  async goToPrevPage() {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    if (await prevBtn.isEnabled().catch(() => false)) {
      await prevBtn.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);
    }
  }

  async getTotalPages(): Promise<number> {
    const paginationVisible = await this.pagination.isVisible().catch(() => false);
    if (!paginationVisible) {
      return 1;
    }
    const totalText = await this.pagination.locator('.ant-pagination-total-text').textContent({ timeout: 3000 }).catch(() => '');
    if (totalText) {
      const match = totalText.match(/共\s*(\d+)\s*条/);
      if (match) {
        return Math.max(1, Math.ceil(parseInt(match[1]) / 10));
      }
    }
    return 1;
  }

  async getFirstOrderId(): Promise<string> {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      const firstCell = rows.first().locator('td').first();
      return (await firstCell.textContent()) || '';
    }
    return '';
  }

  async closeDetailDrawer() {
    const closeBtn = this.page.locator('.ant-drawer-close, .ant-drawer-header-close');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(500);
    } else {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
  }

  async clearFilters() {
    const clearBtn = this.page.locator('button').filter({ hasText: /重置|Reset/ }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }
}
