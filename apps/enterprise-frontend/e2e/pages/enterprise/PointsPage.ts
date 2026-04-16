import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PointsPage {
  readonly page: Page;
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
  readonly statCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table').first();
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="订单"], input[placeholder*="用户"]').first();
    this.searchBtn = page.locator('button').filter({ hasText: /搜索|查询/ }).first();
    this.resetBtn = page.locator('button').filter({ hasText: '重置' }).first();
    this.userSearchInput = page.locator('input[placeholder*="用户"], input[placeholder*="员工"], input[placeholder*="姓名"]').first();
    this.dateRangePicker = page.locator('.ant-picker-range, .ant-range-picker').first();
    this.pagination = page.locator('.ant-pagination');
    this.exportBtn = page.locator('button').filter({ hasText: '导出' }).first();
    this.adjustPointsBtn = page.locator('button').filter({ hasText: '调整' }).first();
    this.refreshBtn = page.locator('button').filter({ hasText: '刷新' }).first();
    this.statCards = page.locator('.ant-card, .ant-statistic');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/ points`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getRowCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }

  async searchByUser(userName: string) {
    const input = this.userSearchInput;
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(userName);
      await this.searchBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1500);
    }
  }

  async clickSearch() {
    const btn = this.searchBtn;
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async clickReset() {
    const btn = this.resetBtn;
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async setDateRange(startDate: string, endDate: string) {
    if (await this.dateRangePicker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.dateRangePicker.click();
      await this.page.waitForSelector('.ant-picker-panel', { timeout: 5000 });
      const inputs = this.page.locator('.ant-picker-input input');
      await inputs.first().fill(startDate);
      await inputs.last().fill(endDate);
      await this.page.keyboard.press('Enter');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1500);
    }
  }

  async goToNextPage() {
    const nextBtn = this.pagination.locator('.ant-pagination-next');
    if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async goToPrevPage() {
    const prevBtn = this.pagination.locator('.ant-pagination-prev');
    if (await prevBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await prevBtn.click();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
  }

  async getTotalPages(): Promise<number> {
    if (!(await this.pagination.isVisible({ timeout: 3000 }).catch(() => false))) {
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

  async isPaginationVisible(): Promise<boolean> {
    return await this.pagination.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async isTableVisible(): Promise<boolean> {
    return await this.table.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async clickAdjustPoints() {
    const btn = this.adjustPointsBtn;
    const hasAdjust = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasAdjust) {
      await btn.click();
    } else {
      const rows = await this.getTableRows();
      if (await rows.count() > 0) {
        const tableAdjustBtn = rows.first().locator('button').filter({ hasText: '调整' });
        if (await tableAdjustBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tableAdjustBtn.click();
        }
      }
    }
    await this.page.waitForSelector('.ant-modal, .ant-drawer', { timeout: 5000 });
  }

  async fillAdjustmentForm(type: 'increase' | 'decrease', points: string, reason: string) {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    // Select type
    const typeSelect = modal.locator('.ant-select, .ant-radio-group');
    if (await typeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeSelect.click();
      await this.page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
      const option = type === 'increase'
        ? this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: '增加' }).or(this.page.locator('.ant-radio').filter({ hasText: '增加' }))
        : this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: '减少' }).or(this.page.locator('.ant-radio').filter({ hasText: '减少' }));
      await option.first().click();
    }
    // Fill points
    const pointsInput = modal.locator('input').filter({ hasText: '' }).first();
    if (await pointsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pointsInput.fill(points);
    }
    // Fill reason
    const reasonInput = modal.locator('textarea, input[placeholder*="原因"], input[placeholder*="备注"]');
    if (await reasonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reasonInput.fill(reason);
    }
  }

  async submitAdjustment() {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    const submitBtn = modal.locator('button').filter({ hasText: '确定' }).or(modal.locator('button[type="submit"]'));
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async cancelAdjustment() {
    const modal = this.page.locator('.ant-modal, .ant-drawer');
    const cancelBtn = modal.locator('button').filter({ hasText: '取消' });
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async closeModal() {
    const closeBtn = this.page.locator('.ant-modal-close, .ant-drawer-close').or(this.page.locator('.ant-modal-close-x'));
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  async refresh() {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async viewPointsDetail(rowIndex: number) {
    const rows = await this.getTableRows();
    const count = await rows.count();
    if (count > 0 && rowIndex < count) {
      const detailBtn = rows.nth(rowIndex).locator('button').filter({ hasText: '查看' }).or(rows.nth(rowIndex).locator('a').filter({ hasText: '详情' }));
      if (await detailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
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
      return (await rows.first().locator('td').nth(1).textContent({ timeout: 3000 }).catch(() => '')) || '';
    }
    return '';
  }

  async getTotalPoints(): Promise<string> {
    const card = this.statCards.filter({ hasText: '总积分' });
    const valueEl = card.locator('.ant-statistic-content-value, .stat-value');
    return (await valueEl.textContent({ timeout: 3000 }).catch(() => '0')) || '0';
  }

  async isModalVisible(): Promise<boolean> {
    return await this.page.locator('.ant-modal, .ant-drawer').isVisible({ timeout: 3000 }).catch(() => false);
  }
}
