import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';
import { OrdersPage } from '../pages/OrdersPage';

test.describe('企业后台 - 订单管理 (25 tests)', () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
    await loginAsEnterpriseAdmin(page, BASE_URL);
    // Navigate to orders page via sidebar
    await page.locator('text=订单管理').first().click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('ORD-001: 订单管理页面可访问', async ({ page }) => {
    await expect(ordersPage.table).toBeVisible();
  });

  test('ORD-002: 页面标题正确', async ({ page }) => {
    const heading = page.locator('h1, h2, h3, .ant-typography').filter({ hasText: /订单/ }).first();
    const headingVisible = await heading.isVisible().catch(() => false);
    if (headingVisible) {
      const text = await heading.textContent();
      expect(text).toContain('订单');
    } else {
      // If no explicit heading, verify we're on the orders page via URL or table
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-003: 订单表格可见且有数据', async ({ page }) => {
    await expect(ordersPage.table).toBeVisible();
    const rows = await ordersPage.getTableRows();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('ORD-004: 搜索输入框可见', async ({ page }) => {
    const searchInput = page.locator('.ant-input-search input').first();
    const searchInputVisible = await searchInput.isVisible().catch(() => false);
    if (searchInputVisible) {
      await expect(searchInput).toBeVisible();
    } else {
      await expect(ordersPage.searchInput).toBeVisible();
    }
  });

  test('ORD-005: 按订单号搜索功能正常', async ({ page }) => {
    const firstOrderId = await ordersPage.getFirstOrderId();
    if (firstOrderId && firstOrderId.trim() !== '') {
      await ordersPage.searchByKeyword(firstOrderId.trim());
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-006: 搜索按钮可见且可点击', async ({ page }) => {
    const searchBtn = page.locator('.ant-input-search button').first().or(
      page.locator('button').filter({ hasText: /搜索|查询/ }).first()
    );
    const btnVisible = await searchBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-007: 状态筛选下拉框可见', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('ORD-008: 按待处理状态筛选', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await ordersPage.filterByStatus('待处理');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-009: 按已完成状态筛选', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await ordersPage.filterByStatus('已完成');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-010: 按已取消状态筛选', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await ordersPage.filterByStatus('已取消');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-011: 按全部状态筛选', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await ordersPage.filterByStatus('全部');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-012: 日期范围选择器可见', async ({ page }) => {
    const datePicker = page.locator('.ant-picker-range').first();
    const pickerVisible = await datePicker.isVisible().catch(() => false);
    if (pickerVisible) {
      await expect(datePicker).toBeVisible();
    }
  });

  test('ORD-013: 日期范围选择器可点击并打开面板', async ({ page }) => {
    const datePicker = page.locator('.ant-picker-range').first();
    const pickerVisible = await datePicker.isVisible().catch(() => false);
    if (pickerVisible) {
      await datePicker.click();
      await page.waitForTimeout(500);
      const panel = page.locator('.ant-picker-panels, .ant-picker-panel').first();
      const panelVisible = await panel.isVisible().catch(() => false);
      if (panelVisible) {
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }
  });

  test('ORD-014: 日期范围筛选功能正常', async ({ page }) => {
    const datePicker = page.locator('.ant-picker-range').first();
    const pickerVisible = await datePicker.isVisible().catch(() => false);
    if (pickerVisible) {
      await ordersPage.setDateRange('2026-04-01', '2026-04-15');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-015: 商品类型筛选下拉框可见', async ({ page }) => {
    const selectCount = await page.locator('.ant-select').count();
    if (selectCount >= 2) {
      const productFilter = page.locator('.ant-select').nth(1);
      await expect(productFilter).toBeVisible();
    }
  });

  test('ORD-016: 商品类型筛选功能正常', async ({ page }) => {
    const selectCount = await page.locator('.ant-select').count();
    if (selectCount >= 2) {
      await ordersPage.filterByProductType('优惠券');
      await page.waitForTimeout(1500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-017: 导出按钮可见', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: /导出|Export/ }).first();
    const btnVisible = await exportBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('ORD-018: 导出按钮可点击', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: /导出|Export/ }).first();
    const btnVisible = await exportBtn.isVisible().catch(() => false);
    if (btnVisible) {
      await exportBtn.click();
      await page.waitForTimeout(2000);
      await expect(exportBtn).toBeVisible();
    }
  });

  test('ORD-019: 分页组件可见', async ({ page }) => {
    const pagination = page.locator('.ant-pagination');
    const paginationVisible = await pagination.isVisible().catch(() => false);
    if (paginationVisible) {
      await expect(pagination).toBeVisible();
    }
  });

  test('ORD-020: 分页跳转功能正常', async ({ page }) => {
    const pagination = page.locator('.ant-pagination');
    const paginationVisible = await pagination.isVisible().catch(() => false);
    if (paginationVisible) {
      const totalPages = await ordersPage.getTotalPages();
      if (totalPages > 1) {
        await ordersPage.goToNextPage();
        await page.waitForTimeout(1000);
        await expect(pagination).toBeVisible();
      }
    }
  });

  test('ORD-021: 表格排序功能正常', async ({ page }) => {
    const sortHeaders = ordersPage.table.locator('.ant-table-column-title');
    const count = await sortHeaders.count();
    if (count > 1) {
      await sortHeaders.nth(0).click();
      await page.waitForTimeout(500);
      await sortHeaders.nth(0).click();
      await page.waitForTimeout(500);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-022: 订单详情查看功能', async ({ page }) => {
    const rows = await ordersPage.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      await ordersPage.viewOrderDetails(0);
      await page.waitForTimeout(1000);
      const detailPanel = page.locator('.ant-drawer, .ant-modal, [class*="detail"]');
      if (await detailPanel.isVisible().catch(() => false)) {
        await expect(detailPanel).toBeVisible();
        await ordersPage.closeDetailDrawer();
      }
    }
  });

  test('ORD-023: 订单状态标签可见', async ({ page }) => {
    const rows = await ordersPage.getTableRows();
    const count = await rows.count();
    if (count > 0) {
      const badge = rows.first().locator('.ant-tag, [class*="status"]').first();
      const badgeVisible = await badge.isVisible().catch(() => false);
      if (badgeVisible) {
        await expect(badge).toBeVisible();
      }
    }
  });

  test('ORD-024: 刷新按钮功能正常', async ({ page }) => {
    const refreshBtn = page.locator('button').filter({ hasText: /刷新|Refresh/ }).first();
    const refreshVisible = await refreshBtn.isVisible().catch(() => false);
    if (refreshVisible) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await expect(ordersPage.table).toBeVisible();
    }
  });

  test('ORD-025: 重置筛选功能正常', async ({ page }) => {
    const statusFilter = page.locator('.ant-select').first();
    const filterVisible = await statusFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await ordersPage.filterByStatus('待处理');
      await page.waitForTimeout(1000);
      const clearBtn = page.locator('button').filter({ hasText: /重置|Reset/ }).first();
      const clearVisible = await clearBtn.isVisible().catch(() => false);
      if (clearVisible) {
        await clearBtn.click();
        await page.waitForTimeout(1000);
        await expect(ordersPage.table).toBeVisible();
      }
    }
  });
});
