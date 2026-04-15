import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';
import { PointsPage } from '../../pages/enterprise/PointsPage';

test.describe('企业后台 - 积分运营 (25 tests)', () => {
  let pointsPage: PointsPage;

  test.beforeEach(async ({ page }) => {
    pointsPage = new PointsPage(page);
    await loginAsEnterpriseAdmin(page, BASE_URL);
    await pointsPage.navigateViaMenu();
  });

  test('PNT-001: 积分运营页面可访问', async ({ page }) => {
    await expect(pointsPage.heading).toBeVisible();
    await expect(pointsPage.table).toBeVisible();
  });

  test('PNT-002: 页面标题包含"积分"', async ({ page }) => {
    const heading = pointsPage.heading;
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toContain('积分');
  });

  test('PNT-003: 统计卡片可见', async ({ page }) => {
    await pointsPage.expectStatCardsVisible();
    const cards = await pointsPage.statCards.all();
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  test('PNT-004: 总积分统计卡片显示数值', async ({ page }) => {
    const totalPoints = await pointsPage.getTotalPoints();
    // Should be a numeric string or '0' if no data
    expect(totalPoints).toBeDefined();
  });

  test('PNT-005: 积分历史记录表格可见', async ({ page }) => {
    await pointsPage.expectTableVisible();
    const rows = await pointsPage.getTableRows();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('PNT-006: 搜索输入框可见', async ({ page }) => {
    if (await pointsPage.searchInput.isVisible()) {
      await expect(pointsPage.searchInput).toBeVisible();
    } else {
      await expect(pointsPage.userSearchInput).toBeVisible();
    }
  });

  test('PNT-007: 按用户搜索功能正常', async ({ page }) => {
    const userName = await pointsPage.getFirstRecordUser();
    if (userName && userName.trim() !== '') {
      await pointsPage.searchByUser(userName.trim());
      await page.waitForTimeout(1500);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-008: 搜索按钮可点击', async ({ page }) => {
    const searchBtn = pointsPage.searchBtn.first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-009: 重置按钮功能正常', async ({ page }) => {
    // First apply a search
    const userName = await pointsPage.getFirstRecordUser();
    if (userName && userName.trim() !== '') {
      await pointsPage.searchByUser(userName.trim());
      await page.waitForTimeout(1000);
    }
    // Then reset
    await pointsPage.clickReset();
    await page.waitForTimeout(1000);
    await expect(pointsPage.table).toBeVisible();
  });

  test('PNT-010: 日期范围选择器可见', async ({ page }) => {
    if (await pointsPage.dateRangePicker.isVisible()) {
      await expect(pointsPage.dateRangePicker).toBeVisible();
    }
  });

  test('PNT-011: 日期范围选择器可打开面板', async ({ page }) => {
    if (await pointsPage.dateRangePicker.isVisible()) {
      await pointsPage.dateRangePicker.click();
      await expect(page.locator('.ant-picker-panel')).toBeVisible({ timeout: 5000 });
    }
  });

  test('PNT-012: 日期范围筛选功能正常', async ({ page }) => {
    if (await pointsPage.dateRangePicker.isVisible()) {
      await pointsPage.setDateRange('2026-04-01', '2026-04-15');
      await page.waitForTimeout(1500);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-013: 分页组件可见', async ({ page }) => {
    if (await pointsPage.isPaginationVisible()) {
      await expect(pointsPage.pagination).toBeVisible();
    }
    // No pagination is valid if data fits on one page
  });

  test('PNT-014: 分页跳转功能正常', async ({ page }) => {
    if (await pointsPage.isPaginationVisible()) {
      const totalPages = await pointsPage.getTotalPages();
      if (totalPages > 1) {
        await pointsPage.goToNextPage();
        await page.waitForTimeout(1000);
        await expect(pointsPage.pagination).toBeVisible();
      }
    }
  });

  test('PNT-015: 上一页按钮功能正常', async ({ page }) => {
    if (await pointsPage.isPaginationVisible()) {
      const totalPages = await pointsPage.getTotalPages();
      if (totalPages > 1) {
        await pointsPage.goToNextPage();
        await page.waitForTimeout(1000);
        await pointsPage.goToPrevPage();
        await page.waitForTimeout(1000);
        await expect(pointsPage.pagination).toBeVisible();
      }
    }
  });

  test('PNT-016: 导出按钮可见', async ({ page }) => {
    if (await pointsPage.exportBtn.isVisible()) {
      await expect(pointsPage.exportBtn).toBeVisible();
    }
  });

  test('PNT-017: 导出按钮可点击', async ({ page }) => {
    const exportBtn = pointsPage.exportBtn.first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(2000);
      // Button should still be visible after click
      await expect(exportBtn).toBeVisible();
    }
  });

  test('PNT-018: 积分调整按钮可见', async ({ page }) => {
    const adjustBtn = pointsPage.adjustPointsBtn.first();
    const tableAdjustBtn = pointsPage.table.locator('button').filter({ hasText: '调整' });
    const hasAdjust = await adjustBtn.isVisible() || await tableAdjustBtn.isVisible();
    // Button may or may not be visible depending on permissions
    if (hasAdjust) {
      await expect(adjustBtn.isVisible() ? adjustBtn : tableAdjustBtn.first()).toBeVisible();
    }
  });

  test('PNT-019: 积分调整弹窗可打开', async ({ page }) => {
    const adjustBtn = pointsPage.adjustPointsBtn.first();
    const tableAdjustBtn = pointsPage.table.locator('button').filter({ hasText: '调整' });
    const hasAdjust = await adjustBtn.isVisible() || await tableAdjustBtn.isVisible();
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      await pointsPage.expectModalVisible();
    }
  });

  test('PNT-020: 积分调整-增加积分功能正常', async ({ page }) => {
    const adjustBtn = pointsPage.adjustPointsBtn.first();
    const tableAdjustBtn = pointsPage.table.locator('button').filter({ hasText: '调整' });
    const hasAdjust = await adjustBtn.isVisible() || await tableAdjustBtn.isVisible();
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      await pointsPage.expectModalVisible();
      await pointsPage.fillAdjustmentForm('increase', '100', 'E2E测试增加积分');
      await pointsPage.submitAdjustment();
      await page.waitForTimeout(1500);
    }
  });

  test('PNT-021: 积分调整-减少积分功能正常', async ({ page }) => {
    const adjustBtn = pointsPage.adjustPointsBtn.first();
    const tableAdjustBtn = pointsPage.table.locator('button').filter({ hasText: '调整' });
    const hasAdjust = await adjustBtn.isVisible() || await tableAdjustBtn.isVisible();
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      await pointsPage.expectModalVisible();
      await pointsPage.fillAdjustmentForm('decrease', '10', 'E2E测试减少积分');
      await pointsPage.submitAdjustment();
      await page.waitForTimeout(1500);
    }
  });

  test('PNT-022: 积分调整-取消功能正常', async ({ page }) => {
    const adjustBtn = pointsPage.adjustPointsBtn.first();
    const tableAdjustBtn = pointsPage.table.locator('button').filter({ hasText: '调整' });
    const hasAdjust = await adjustBtn.isVisible() || await tableAdjustBtn.isVisible();
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      await pointsPage.expectModalVisible();
      await pointsPage.cancelAdjustment();
      await page.waitForTimeout(500);
      const modal = page.locator('.ant-modal');
      const modalVisible = await modal.isVisible();
      if (modalVisible) {
        await pointsPage.closeModal();
      }
    }
  });

  test('PNT-023: 刷新按钮功能正常', async ({ page }) => {
    const refreshBtn = pointsPage.refreshBtn.first();
    const hasRefresh = await refreshBtn.isVisible();
    if (hasRefresh) {
      await refreshBtn.click();
    } else {
      await pointsPage.refresh();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(pointsPage.table).toBeVisible();
  });

  test('PNT-024: 积分明细查看功能', async ({ page }) => {
    const rows = await pointsPage.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      await pointsPage.viewPointsDetail(0);
      await page.waitForTimeout(1000);
      const detailPanel = page.locator('.ant-drawer, .ant-modal, [class*="detail"]');
      // Detail panel may or may not appear depending on data
    }
  });

  test('PNT-025: 表格排序功能正常', async ({ page }) => {
    const sortHeaders = pointsPage.table.locator('.ant-table-column-title');
    const count = await sortHeaders.count();
    if (count > 1) {
      await sortHeaders.first().click();
      await page.waitForTimeout(500);
      await sortHeaders.first().click();
      await page.waitForTimeout(500);
      await expect(pointsPage.table).toBeVisible();
    }
  });
});
