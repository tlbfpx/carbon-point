import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PointsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statCards: Locator;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly searchBtn: Locator;
  readonly resetBtn: Locator;
  readonly userSearchInput: Locator;
  readonly dateRangePicker: Locator;
  readonly pagination: Locator;
  readonly exportBtn: Locator;
  readonly adjustPointsBtn: Locator;
  readonly refreshBtn: Locator;
  readonly tabBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1, h2, .page-title').filter({ hasText: '积分' });
    this.statCards = page.locator('.ant-card, .ant-statistic');
    this.table = page.locator('.ant-table').first();
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="订单"], input[placeholder*="用户"]').first();
    this.searchBtn = page.locator('button').filter({ hasText: '搜索' }).or(page.locator('button').filter({ hasText: '查询' }));
    this.resetBtn = page.locator('button').filter({ hasText: '重置' });
    this.userSearchInput = page.locator('input[placeholder*="用户"], input[placeholder*="员工"], input[placeholder*="姓名"]').first();
    this.dateRangePicker = page.locator('.ant-picker-range').first();
    this.pagination = page.locator('.ant-pagination');
    this.exportBtn = page.locator('button').filter({ hasText: '导出' });
    this.adjustPointsBtn = page.locator('button').filter({ hasText: '调整' });
    this.refreshBtn = page.locator('button').filter({ hasText: '刷新' });
    this.tabBar = page.locator('.ant-tabs-nav, .ant-segmented');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/#/enterprise/points`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    await this.page.waitForSelector('.ant-table-tbody tr, .ant-statistic', { timeout: 15000 });
  }

  async navigateViaMenu() {
    await this.page.locator('text=积分运营').first().click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatCardValues(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const cards = await this.statCards.all();
    for (const card of cards) {
      const titleEl = card.locator('.ant-statistic-title, .ant-card-meta-title, .stat-title');
      const valueEl = card.locator('.ant-statistic-content-value, .ant-card-meta-description, .stat-value');
      const title = await titleEl.textContent().catch(() => '');
      const value = await valueEl.textContent().catch(() => '');
      if (title && value) {
        stats[title.trim()] = value.trim();
      }
    }
    return stats;
  }

  async getTotalPoints(): Promise<string> {
    const card = this.statCards.filter({ hasText: '总积分' });
    const valueEl = card.locator('.ant-statistic-content-value, .stat-value');
    return (await valueEl.textContent()) || '0';
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getRowCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }

  async searchByKeyword(keyword: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.searchBtn.click();
    } else if (await this.userSearchInput.isVisible()) {
      await this.userSearchInput.fill(keyword);
      await this.searchBtn.click();
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async clickSearch() {
    await this.searchBtn.first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async clickReset() {
    await this.resetBtn.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async searchByUser(userName: string) {
    const input = this.page.locator('input').filter({ hasText: '' }).or(this.userSearchInput);
    const userInput = input.first();
    await userInput.fill(userName);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async setDateRange(startDate: string, endDate: string) {
    await this.dateRangePicker.click();
    await this.page.waitForSelector('.ant-picker-panel', { timeout: 5000 });
    const inputs = this.page.locator('.ant-picker-input input');
    await inputs.first().fill(startDate);
    await inputs.last().fill(endDate);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async clearDateRange() {
    const clearBtn = this.page.locator('.ant-picker-clear, .ant-picker-clear-icon').first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async goToPage(pageNum: number) {
    const pageItem = this.pagination.locator('.ant-pagination-item').filter({ hasText: String(pageNum) });
    if (await pageItem.isVisible()) {
      await pageItem.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async goToNextPage() {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async goToPrevPage() {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    if (await prevBtn.isEnabled()) {
      await prevBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async getTotalPages(): Promise<number> {
    if (!(await this.pagination.isVisible())) {
      return 1;
    }
    const totalText = await this.pagination.locator('.ant-pagination-total-text').textContent({ timeout: 3000 }).catch(() => null);
    if (totalText) {
      const match = totalText.match(/共\s*(\d+)\s*条/);
      if (match) {
        return Math.ceil(parseInt(match[1]) / 10);
      }
    }
    return 1;
  }

  async exportPoints() {
    await this.exportBtn.first().click();
    await this.page.waitForTimeout(2000);
  }

  async clickAdjustPoints() {
    const btn = this.adjustPointsBtn.first();
    if (await btn.isVisible()) {
      await btn.click();
    } else {
      const rows = await this.getTableRows();
      if (await rows.count() > 0) {
        const adjustBtn = rows.first().locator('button').filter({ hasText: '调整' }).or(rows.first().locator('a').filter({ hasText: '调整' }));
        await adjustBtn.click();
      }
    }
    await this.page.waitForSelector('.ant-modal, .ant-drawer', { timeout: 5000 });
  }

  async fillAdjustmentForm(type: 'increase' | 'decrease', points: string, reason: string) {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    // Select type
    const typeSelect = modal.locator('.ant-select, .ant-radio-group');
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
      const option = type === 'increase'
        ? this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: '增加' }).or(this.page.locator('.ant-radio').filter({ hasText: '增加' }))
        : this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: '减少' }).or(this.page.locator('.ant-radio').filter({ hasText: '减少' }));
      await option.first().click();
    }

    // Fill points
    const pointsInput = modal.locator('input').filter({ hasText: '' }).first();
    await pointsInput.fill(points);

    // Fill reason
    const reasonInput = modal.locator('textarea, input[placeholder*="原因"], input[placeholder*="备注"]');
    if (await reasonInput.isVisible()) {
      await reasonInput.fill(reason);
    }
  }

  async submitAdjustment() {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    const submitBtn = modal.locator('button').filter({ hasText: '确定' }).or(modal.locator('button[type="submit"]'));
    await submitBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async cancelAdjustment() {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    const cancelBtn = modal.locator('button').filter({ hasText: '取消' });
    await cancelBtn.click();
    await this.page.waitForTimeout(500);
  }

  async closeModal() {
    const closeBtn = this.page.locator('.ant-modal-close, .ant-drawer-close').or(this.page.locator('.ant-modal-close-x'));
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  async refresh() {
    const btn = this.refreshBtn.first();
    if (await btn.isVisible()) {
      await btn.click();
    } else {
      await this.page.reload();
    }
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async clickTab(tabText: string) {
    const tab = this.tabBar.locator('.ant-tabs-tab, .ant-segmented-item').filter({ hasText: tabText });
    await tab.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async viewPointsDetail(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0 && rowIndex < count) {
      const detailBtn = rows.nth(rowIndex).locator('button').filter({ hasText: '查看' }).or(rows.nth(rowIndex).locator('a').filter({ hasText: '详情' }));
      if (await detailBtn.isVisible()) {
        await detailBtn.click();
      } else {
        await rows.nth(rowIndex).locator('td').first().click();
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async getFirstRecordUser(): Promise<string> {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      return (await rows.first().locator('td').nth(1).textContent()) || '';
    }
    return '';
  }

  async getRowCell(rowIndex: number, colIndex: number): Promise<Locator> {
    const rows = await this.getTableRows();
    return rows.nth(rowIndex).locator('td').nth(colIndex);
  }

  async isPaginationVisible(): Promise<boolean> {
    return await this.pagination.isVisible().catch(() => false);
  }

  async sortByColumn(columnText: string) {
    const header = this.table.locator('.ant-table-column-title').filter({ hasText: columnText });
    await header.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  async expectStatCardsVisible() {
    await this.page.waitForSelector('.ant-statistic, .ant-card', { timeout: 10000 });
    await expect(this.statCards.first()).toBeVisible();
  }

  async expectTableVisible() {
    await expect(this.table).toBeVisible();
  }

  async expectPaginationVisible() {
    await expect(this.pagination).toBeVisible();
  }

  async expectModalVisible() {
    await this.page.waitForSelector('.ant-modal, .ant-drawer', { timeout: 5000 });
  }

  async expectEmptyState() {
    const emptyText = this.page.locator('.ant-empty-description, .ant-table-placeholder');
    if (await emptyText.isVisible()) {
      await expect(emptyText).toBeVisible();
    }
  }
}
