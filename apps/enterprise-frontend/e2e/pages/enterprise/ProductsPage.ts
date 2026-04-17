import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class ProductsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly searchInput: Locator;
  readonly productTypeFilter: Locator;
  readonly statusFilter: Locator;
  readonly categoryFilter: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2').filter({ hasText: '商品' });
    this.addButton = page.locator('button').filter({ hasText: /创建|新增/ });
    this.table = page.locator('.ant-table');
    this.tableRows = this.table.locator('.ant-table-tbody tr');
    // Use the actual input inside the search wrapper
    this.searchInput = page.locator('.ant-input-search input').or(
      page.locator('input.ant-input')
    );
    this.productTypeFilter = page.locator('.ant-select').filter({ hasText: /类型|商品类型/ }).first();
    this.statusFilter = page.locator('.ant-select').filter({ hasText: /状态/ }).first();
    this.categoryFilter = page.locator('.ant-select').filter({ hasText: /分类/ }).first();
    this.pagination = page.locator('.ant-pagination');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/products`);
    await this.page.waitForSelector('.ant-table, .ant-empty', { timeout: 10000 });
  }

  async clickAddProduct() {
    await this.addButton.click({ timeout: 5000 });
    await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
  }

  getModal(): Locator {
    return this.page.locator('.ant-modal');
  }

  async getModalTitle(): Promise<string> {
    const modal = this.getModal();
    return await modal.locator('.ant-modal-title').textContent() || '';
  }

  async fillProductName(name: string) {
    const modal = this.getModal();
    const nameInput = modal.locator('input').first();
    await nameInput.fill(name);
  }

  async selectProductType(type: 'coupon' | 'recharge' | 'privilege') {
    const typeMap: Record<string, string> = {
      coupon: '优惠券',
      recharge: '直充',
      privilege: '权益'
    };
    const modal = this.getModal();
    const typeSelect = modal.locator('.ant-select').first();
    await typeSelect.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: typeMap[type] }).click();
  }

  async fillPrice(price: string) {
    const modal = this.getModal();
    // Ant Design InputNumber renders as .ant-input-number with an input inside
    const numberInput = modal.locator('.ant-input-number input').or(modal.locator('input.ant-input-number-input'));
    if (await numberInput.count() > 0) {
      await numberInput.first().fill(price);
    } else {
      // Fallback: find by label "积分价格" which contains "积分" and "价格"
      const priceField = modal.locator('.ant-form-item').filter({ hasText: /积分价格/ }).locator('input');
      const fieldCount = await priceField.count();
      if (fieldCount > 0) {
        await priceField.first().fill(price);
      } else {
        // Last resort: fill any number input in the modal
        const anyInput = modal.locator('input[type="number"]').or(modal.locator('.ant-input-number'));
        const anyCount = await anyInput.count();
        if (anyCount > 0) {
          await anyInput.first().click();
          await this.page.keyboard.type(price);
        }
      }
    }
  }

  async fillInventory(inventory: string) {
    const modal = this.getModal();
    const inputs = modal.locator('input[type="number"]');
    if (await inputs.count() > 1) {
      await inputs.nth(1).fill(inventory);
    } else {
      const invField = modal.locator('.ant-form-item-label label').filter({ hasText: /库存/ }).locator('..').locator('input');
      await invField.fill(inventory);
    }
  }

  async fillDescription(description: string) {
    const modal = this.getModal();
    const descField = modal.locator('textarea');
    await descField.fill(description);
  }

  async selectCategory(category: string) {
    const modal = this.getModal();
    const categorySelect = modal.locator('.ant-form-item-label label').filter({ hasText: /分类/ }).locator('..').locator('.ant-select');
    await categorySelect.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: category }).click();
  }

  async submitProduct() {
    const modal = this.getModal();
    const submitBtn = modal.locator('button[type="submit"]').or(
      modal.locator('button.ant-btn-primary')
    );
    await submitBtn.first().click();
    await this.page.waitForTimeout(1000);
  }

  async cancelProduct() {
    const modal = this.getModal();
    await modal.locator('button').filter({ hasText: '取消' }).click();
    await this.page.waitForTimeout(500);
  }

  async closeModal() {
    const modal = this.getModal();
    const closeBtn = modal.locator('.ant-modal-close').or(this.page.locator('.ant-modal-close'));
    await closeBtn.click();
    await this.page.waitForTimeout(300);
  }

  async getProductCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async getProductName(rowIndex: number): Promise<string> {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      return await rows[rowIndex].locator('.ant-table-cell').first().textContent() || '';
    }
    return '';
  }

  async getProductStatus(rowIndex: number): Promise<string> {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      if (await toggle.count() > 0) {
        const cls = await toggle.getAttribute('class');
        return cls?.includes('ant-switch-checked') ? '已上架' : '已下架';
      }
      const cells = rows[rowIndex].locator('.ant-table-cell');
      const cellCount = await cells.count();
      for (let i = 0; i < cellCount; i++) {
        const text = await cells.nth(i).textContent() || '';
        if (text.includes('上架') || text.includes('下架') || text.includes('在售') || text.includes('停售')) {
          return text.trim();
        }
      }
    }
    return '';
  }

  async toggleProductStatus(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      if (await toggle.count() > 0) {
        await toggle.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async editProduct(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const editBtn = rows[rowIndex].locator('button').filter({ hasText: '编辑' }).or(
        rows[rowIndex].locator('a').filter({ hasText: '编辑' })
      );
      await editBtn.click();
      await this.page.waitForSelector('.ant-modal', { timeout: 5000 });
    }
  }

  async deleteProduct(rowIndex: number) {
    const rows = await this.tableRows.all();
    if (rows.length > rowIndex) {
      const deleteBtn = rows[rowIndex].locator('button').filter({ hasText: '删除' }).or(
        rows[rowIndex].locator('a').filter({ hasText: '删除' })
      );
      await deleteBtn.click();
      await this.page.waitForSelector('.ant-popover, .ant-modal-confirm', { timeout: 5000 });
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).or(
        this.page.locator('.ant-modal-confirm .ant-btn').filter({ hasText: '确定' })
      ).first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  async searchKeyword(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async clearSearch() {
    const clearBtn = this.searchInput.locator('..').locator('.ant-input-clear-icon');
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async filterByProductType(type: 'coupon' | 'recharge' | 'privilege' | 'all') {
    const typeMap: Record<string, string> = {
      coupon: '券码',
      recharge: '直充',
      privilege: '权益',
      all: '全部'
    };
    const filterSelect = this.page.locator('.ant-table-filter-trigger').or(
      this.page.locator('.ant-select').filter({ hasText: /类型/ }).first()
    );
    await filterSelect.click();
    await this.page.waitForTimeout(500);
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: typeMap[type] }).click();
    await this.page.waitForTimeout(500);
  }

  async filterByStatus(status: 'online' | 'offline' | 'all') {
    const statusMap: Record<string, string> = {
      online: '上架',
      offline: '下架',
      all: '全部'
    };
    const filterSelect = this.statusFilter.or(
      this.page.locator('.ant-select').filter({ hasText: /状态/ }).first()
    );
    await filterSelect.click();
    await this.page.waitForTimeout(500);
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: statusMap[status] }).click();
    await this.page.waitForTimeout(500);
  }

  async goToPage(pageNum: number) {
    const pageItem = this.pagination.locator('.ant-pagination-item').filter({ hasText: String(pageNum) });
    await pageItem.click();
    await this.page.waitForTimeout(1000);
  }

  async goToNextPage() {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    await nextBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async goToPrevPage() {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    await prevBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async changePageSize(size: number) {
    const sizeChanger = this.pagination.locator('.ant-pagination-options-size-changer');
    await sizeChanger.click();
    await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: String(size) }).click();
    await this.page.waitForTimeout(1000);
  }

  async getCurrentPage(): Promise<number> {
    const activeItem = this.pagination.locator('.ant-pagination-item-active');
    const text = await activeItem.textContent({ timeout: 3000 }).catch(() => '1');
    return parseInt(text || '1', 10);
  }

  async getTotalPages(): Promise<number> {
    const totalText = await this.pagination.locator('.ant-pagination-total-text').textContent().catch(() => '');
    if (totalText) {
      const match = totalText.match(/(\d+)/g);
      if (match && match.length >= 2) {
        return Math.ceil(parseInt(match[match.length - 1], 10) / 10);
      }
      const totalMatch = totalText.match(/共\s*(\d+)/);
      if (totalMatch) {
        return Math.ceil(parseInt(totalMatch[1], 10) / 10);
      }
    }
    return 1;
  }

  async getColumnHeaders(): Promise<string[]> {
    const headers = this.table.locator('.ant-table-thead th');
    const count = await headers.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await headers.nth(i).textContent();
      if (text) result.push(text.trim());
    }
    return result;
  }

  async getTableRowData(rowIndex: number): Promise<Record<string, string>> {
    const rows = await this.tableRows.all();
    const data: Record<string, string> = {};
    if (rows.length > rowIndex) {
      const cells = rows[rowIndex].locator('.ant-table-cell');
      const headers = await this.getColumnHeaders();
      const cellCount = await cells.count();
      for (let i = 0; i < Math.min(cellCount, headers.length); i++) {
        const header = headers[i];
        const text = await cells.nth(i).textContent();
        if (header && text) {
          data[header] = text.trim();
        }
      }
    }
    return data;
  }

  async expectTableVisible() {
    await expect(this.table).toBeVisible();
  }
}
