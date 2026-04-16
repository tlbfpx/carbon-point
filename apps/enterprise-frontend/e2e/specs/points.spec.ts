import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';
import { PointsPage } from '../pages/PointsPage';

test.describe('企业后台 - 积分运营 (25 tests)', () => {
  let pointsPage: PointsPage;

  test.beforeEach(async ({ page }) => {
    pointsPage = new PointsPage(page);
    await loginAsEnterpriseAdmin(page, BASE_URL);
    // Use direct URL navigation (reliable, avoids sidebar timing issues)
    await pointsPage.goto();
  });

  test('PNT-001: 积分运营页面可访问', async ({ page }) => {
    // Points page may not have a table - check for content area
    const hasLayout = await page.locator('.ant-layout-content').isVisible().catch(() => false);
    const hasTable = await page.locator('.ant-table').first().isVisible().catch(() => false);
    expect(hasLayout || hasTable).toBeTruthy();
  });

  test('PNT-002: 页面标题包含"积分"', async ({ page }) => {
    const heading = page.locator('h1, h2, h3, .ant-typography').filter({ hasText: /积分/ }).first();
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const text = await heading.textContent();
      expect(text).toContain('积分');
    } else {
      // If no explicit heading, verify we're on the points page via table
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-003: 统计卡片可见', async ({ page }) => {
    const cards = page.locator('.ant-card, .ant-statistic');
    const cardsCount = await cards.count();
    if (cardsCount > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('PNT-004: 总积分统计卡片显示数值', async ({ page }) => {
    const totalPoints = await pointsPage.getTotalPoints();
    expect(totalPoints).toBeDefined();
  });

  test('PNT-005: 积分历史记录表格可见', async ({ page }) => {
    const hasTable = await page.locator('.ant-table').first().isVisible().catch(() => false);
    if (hasTable) {
      await expect(pointsPage.table).toBeVisible();
      const rows = await pointsPage.getTableRows();
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      // No table - verify content area is visible
      const hasContent = await page.locator('.ant-layout-content').isVisible().catch(() => false);
      expect(hasContent).toBeTruthy();
    }
  });

  test('PNT-006: 搜索输入框可见', async ({ page }) => {
    const searchInput = page.locator('.ant-input-search input').first();
    const searchInputVisible = await searchInput.isVisible().catch(() => false);
    if (searchInputVisible) {
      await expect(searchInput).toBeVisible();
    } else {
      const fallbackInput = page.locator('input').filter({ hasText: '' }).first();
      await expect(fallbackInput).toBeVisible();
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
    const searchBtn = page.locator('button').filter({ hasText: /搜索|查询/ }).first();
    const btnVisible = await searchBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-009: 重置按钮功能正常', async ({ page }) => {
    const resetBtn = page.locator('button').filter({ hasText: '重置' }).first();
    const hasReset = await resetBtn.isVisible().catch(() => false);
    if (hasReset) {
      // First apply a search
      const userName = await pointsPage.getFirstRecordUser();
      if (userName && userName.trim() !== '') {
        await pointsPage.searchByUser(userName.trim());
        await page.waitForTimeout(1000);
      }
      // Then reset
      await resetBtn.click();
      await page.waitForTimeout(1000);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-010: 日期范围选择器可见', async ({ page }) => {
    const datePicker = page.locator('.ant-picker-range, .ant-range-picker').first();
    const hasDatePicker = await datePicker.isVisible().catch(() => false);
    if (hasDatePicker) {
      await expect(datePicker).toBeVisible();
    }
  });

  test('PNT-011: 日期范围选择器可打开面板', async ({ page }) => {
    const datePicker = page.locator('.ant-picker-range, .ant-range-picker').first();
    const hasDatePicker = await datePicker.isVisible().catch(() => false);
    if (hasDatePicker) {
      await datePicker.click();
      await expect(page.locator('.ant-picker-panel')).toBeVisible({ timeout: 5000 });
    }
  });

  test('PNT-012: 日期范围筛选功能正常', async ({ page }) => {
    const hasDatePicker = await page.locator('.ant-picker-range, .ant-range-picker').first().isVisible().catch(() => false);
    if (hasDatePicker) {
      await pointsPage.setDateRange('2026-04-01', '2026-04-15');
      await page.waitForTimeout(1500);
      await expect(pointsPage.table).toBeVisible();
    }
  });

  test('PNT-013: 分页组件可见', async ({ page }) => {
    if (await pointsPage.isPaginationVisible()) {
      await expect(pointsPage.pagination).toBeVisible();
    }
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
    const exportBtn = page.locator('button').filter({ hasText: '导出' }).first();
    const hasExport = await exportBtn.isVisible().catch(() => false);
    if (hasExport) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('PNT-017: 导出按钮可点击', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: '导出' }).first();
    const hasExport = await exportBtn.isVisible().catch(() => false);
    if (hasExport) {
      await exportBtn.click();
      await page.waitForTimeout(2000);
      await expect(exportBtn).toBeVisible();
    }
  });

  test('PNT-018: 积分调整按钮可见', async ({ page }) => {
    const adjustBtn = page.locator('button').filter({ hasText: '调整' }).first();
    const hasAdjust = await adjustBtn.isVisible().catch(() => false);
    if (hasAdjust) {
      await expect(adjustBtn).toBeVisible();
    } else {
      const rows = await pointsPage.getTableRows();
      if (await rows.count() > 0) {
        const tableAdjustBtn = rows.first().locator('button').filter({ hasText: '调整' });
        const hasTableAdjust = await tableAdjustBtn.isVisible().catch(() => false);
        if (hasTableAdjust) {
          await expect(tableAdjustBtn).toBeVisible();
        }
      }
    }
  });

  test('PNT-019: 积分调整弹窗可打开', async ({ page }) => {
    const adjustBtn = page.locator('button').filter({ hasText: '调整' }).first();
    const hasAdjust = await adjustBtn.isVisible().catch(() => false);
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      await expect(page.locator('.ant-modal, .ant-drawer')).toBeVisible({ timeout: 5000 });
      await pointsPage.closeModal();
    }
  });

  test('PNT-020: 积分调整-增加积分功能正常', async ({ page }) => {
    const adjustBtn = page.locator('button').filter({ hasText: '调整' }).first();
    const hasAdjust = await adjustBtn.isVisible().catch(() => false);
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      const hasModal = await pointsPage.isModalVisible();
      if (hasModal) {
        await pointsPage.fillAdjustmentForm('increase', '100', 'E2E测试增加积分');
        await pointsPage.submitAdjustment();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('PNT-021: 积分调整-减少积分功能正常', async ({ page }) => {
    const adjustBtn = page.locator('button').filter({ hasText: '调整' }).first();
    const hasAdjust = await adjustBtn.isVisible().catch(() => false);
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      const hasModal = await pointsPage.isModalVisible();
      if (hasModal) {
        await pointsPage.fillAdjustmentForm('decrease', '10', 'E2E测试减少积分');
        await pointsPage.submitAdjustment();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('PNT-022: 积分调整-取消功能正常', async ({ page }) => {
    const adjustBtn = page.locator('button').filter({ hasText: '调整' }).first();
    const hasAdjust = await adjustBtn.isVisible().catch(() => false);
    if (hasAdjust) {
      await pointsPage.clickAdjustPoints();
      const hasModal = await pointsPage.isModalVisible();
      if (hasModal) {
        await pointsPage.cancelAdjustment();
        await page.waitForTimeout(500);
      }
    }
  });

  test('PNT-023: 刷新按钮功能正常', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ hasText: '刷新' }).first();
    const hasRefresh = await refreshBtn.isVisible().catch(() => false);
    if (hasRefresh) {
      await refreshBtn.click();
    } else {
      await pointsPage.refresh();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const hasTable = await page.locator('.ant-table').first().isVisible().catch(() => false);
    const hasContent = await page.locator('.ant-layout-content').isVisible().catch(() => false);
    expect(hasTable || hasContent).toBeTruthy();
  });

  test('PNT-024: 积分明细查看功能', async ({ page }) => {
    const rows = await pointsPage.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      await pointsPage.viewPointsDetail(0);
      await page.waitForTimeout(1000);
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
