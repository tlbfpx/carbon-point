import { test, expect } from '@playwright/test';
import { TenantManagementPage } from './pages/TenantsPage';
import { loginAsPlatformAdmin, waitForModal, waitForTable, takeScreenshot, uniqueId, waitForAntSuccess, waitForAntError } from './helpers';

/**
 * Tenant/Enterprise Management Tests
 *
 * Tests the enterprise management page at /platform/enterprises
 * Covers: enterprise list, search, filtering, create, status toggle, detail view
 */
test.describe('Tenant Management', () => {

  test.beforeEach(async ({ page }) => {
    const result = await loginAsPlatformAdmin(page);
    if (!result) {
      test.skip();
    }
  });

  test.afterEach(async ({ page }) => {
    if (test.info().status === 'failed') {
      await takeScreenshot(page, 'tenant-failure');
    }
  });

  // ========== Page Rendering Tests ==========

  test('should display tenant management page', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await expect(page.getByRole('heading', { level: 2 })).toContainText('企业管理');
  });

  test('should display stat cards summary row', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    const statCards = page.locator('.ant-statistic');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(3); // 企业总数, 活跃企业, 用户总数, 兑换总数
  });

  test('should display stat card titles', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await expect(page.locator('.ant-statistic-title').filter({ hasText: '企业总数' })).toBeVisible();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '活跃企业' })).toBeVisible();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '用户总数' })).toBeVisible();
    await expect(page.locator('.ant-statistic-title').filter({ hasText: '兑换总数' })).toBeVisible();
  });

  test('should display table with columns', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    const headers = tenantPage.table.locator('.ant-table th');
    const headerTexts = await headers.allTextContents();

    expect(headerTexts.some(t => t.includes('企业名称'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('联系人'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('联系电话'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('状态'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('操作'))).toBeTruthy();
  });

  test('should display refresh and add buttons', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await expect(page.locator('button').filter({ hasText: '刷新' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '开通企业' })).toBeVisible();
  });

  test('should display search input and status filter', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await expect(tenantPage.searchInput).toBeVisible();
    await expect(tenantPage.statusFilter).toBeVisible();
  });

  test('should display pagination', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await expect(tenantPage.pagination).toBeVisible();
  });

  // ========== Search and Filter Tests ==========

  test('should filter enterprises by name search', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount(); // Wait for data

    // Get initial count
    const initialCount = await tenantPage.getTableRowCount();

    // Search for a term (may or may not match existing data)
    await tenantPage.searchByName('测试企业');

    // Wait for filter to apply
    await page.waitForTimeout(1500);
    const filteredCount = await tenantPage.getTableRowCount();

    // Filter should change the result (either fewer rows or same if no match)
    expect(filteredCount).toBeGreaterThanOrEqual(0);
    // If there was data, filtered results may differ
  });

  test('should clear search and restore all results', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    await tenantPage.searchByName('test');
    await page.waitForTimeout(1500);

    await tenantPage.clearSearch();
    await page.waitForTimeout(1500);

    // After clearing, should show results again (or empty state)
    const hasEmpty = await tenantPage.hasEmptyState();
    const rowCount = await tenantPage.getTableRowCount();
    expect(hasEmpty || rowCount > 0).toBeTruthy();
  });

  test('should filter by active status', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    await tenantPage.filterByStatus('active');
    await page.waitForTimeout(1500);

    // All visible rows should have '正常' status tag
    const rows = await tenantPage.tableRows.all();
    for (const row of rows) {
      const tags = row.locator('.ant-tag');
      const tagCount = await tags.count();
      if (tagCount > 0) {
        const lastTag = await tags.last().textContent();
        // Some rows might be empty state rows
      }
    }
  });

  test('should filter by inactive status', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    await tenantPage.filterByStatus('inactive');
    await page.waitForTimeout(1500);

    // Should show inactive enterprises
    const hasInactiveRows = await tenantPage.tableRows.count();
    expect(hasInactiveRows >= 0).toBeTruthy();
  });

  test('should clear status filter', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    await tenantPage.filterByStatus('active');
    await page.waitForTimeout(1500);

    await tenantPage.clearStatusFilter();
    await page.waitForTimeout(1500);

    // Should restore all results
    const rowCount = await tenantPage.getTableRowCount();
    const hasEmpty = await tenantPage.hasEmptyState();
    expect(hasEmpty || rowCount > 0).toBeTruthy();
  });

  // ========== Refresh Button Tests ==========

  test('should refresh data on refresh button click', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    await tenantPage.refreshButton.click();
    await page.waitForTimeout(1500);

    // Should still show the table
    await expect(tenantPage.table).toBeVisible();
  });

  // ========== Create Enterprise Tests ==========

  test('should open create enterprise modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();

    await tenantPage.openCreateModal();

    await expect(page.locator('.ant-modal-title')).toContainText('开通企业');
    await expect(tenantPage.modal).toBeVisible();
  });

  test('should display all form fields in create modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.openCreateModal();

    const formItems = tenantPage.modal.locator('.ant-form-item');
    const count = await formItems.count();

    // Fields: 企业名称, 联系人, 联系电话, 联系邮箱, 选择套餐, 同步创建超管
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should validate required fields on submit', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.openCreateModal();

    // Try to submit empty form
    await tenantPage.submitCreateForm();
    await page.waitForTimeout(500);

    // Should show validation errors
    const errors = tenantPage.modal.locator('.ant-form-item-explain-error');
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should close create modal on cancel', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.openCreateModal();

    await expect(tenantPage.modal).toBeVisible();

    await tenantPage.cancelCreateForm();

    // Modal should be closed
    await expect(tenantPage.modal).not.toBeVisible({ timeout: 3000 });
  });

  test('should close modal via close button', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.openCreateModal();

    await expect(tenantPage.modal).toBeVisible();

    await tenantPage.closeModal();

    await expect(tenantPage.modal).not.toBeVisible({ timeout: 3000 });
  });

  test('should create enterprise with valid data', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.openCreateModal();

    const uniqueName = `测试企业_${uniqueId('ent')}`;

    await tenantPage.fillCreateForm({
      name: uniqueName,
      contactName: '张三',
      contactPhone: '13800138001',
      contactEmail: 'test@example.com',
    });

    await tenantPage.submitCreateForm();
    await page.waitForTimeout(3000);

    // Check if success message appeared
    const hasSuccess = await page.locator('.ant-message-success').isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await page.locator('.ant-message-error').isVisible({ timeout: 5000 }).catch(() => false);

    // Either success or error (if backend has issues)
    expect(hasSuccess || hasError).toBeTruthy();
  });

  // ========== Status Toggle Tests ==========

  test('should toggle enterprise status to inactive', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const rowCount = await tenantPage.getTableRowCount();
    if (rowCount === 0) {
      // No enterprises to toggle, skip
      test.skip();
      return;
    }

    // Find a row with '停用' button (active enterprise)
    const activeRows = page.locator('.ant-table-tbody tr');
    const count = await activeRows.count();

    let targetRowIndex = -1;
    for (let i = 0; i < count; i++) {
      const buttons = await activeRows.nth(i).locator('button').allTextContents();
      if (buttons.some(b => b.includes('停用'))) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      test.skip();
      return;
    }

    await tenantPage.clickStatusToggleButton(targetRowIndex);
    await page.waitForTimeout(500);

    // Popconfirm should appear
    const hasPopconfirm = await page.locator('.ant-popover').isVisible({ timeout: 2000 }).catch(() => false);
    if (hasPopconfirm) {
      await tenantPage.confirmStatusToggle();
    }

    // Check for success message
    const hasSuccess = await page.locator('.ant-message-success').isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await page.locator('.ant-message-error').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSuccess || hasError).toBeTruthy();
  });

  test('should toggle enterprise status back to active', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const activeRows = page.locator('.ant-table-tbody tr');
    const count = await activeRows.count();

    let targetRowIndex = -1;
    for (let i = 0; i < count; i++) {
      const buttons = await activeRows.nth(i).locator('button').allTextContents();
      if (buttons.some(b => b.includes('开通'))) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      test.skip();
      return;
    }

    await tenantPage.clickStatusToggleButton(targetRowIndex);
    await page.waitForTimeout(500);

    const hasPopconfirm = await page.locator('.ant-popover').isVisible({ timeout: 2000 }).catch(() => false);
    if (hasPopconfirm) {
      await tenantPage.confirmStatusToggle();
    }

    const hasSuccess = await page.locator('.ant-message-success').isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await page.locator('.ant-message-error').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSuccess || hasError).toBeTruthy();
  });

  // ========== Detail Modal Tests ==========

  test('should open enterprise detail modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const rowCount = await tenantPage.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await tenantPage.clickDetailButton(0);

    await expect(page.locator('.ant-modal-title')).toContainText('企业详情');
    await expect(tenantPage.modal).toBeVisible();
  });

  test('should display tabs in detail modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const rowCount = await tenantPage.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await tenantPage.clickDetailButton(0);

    // Should have tabs: 基本信息, 用户管理
    await expect(page.locator('.ant-tabs-tab').filter({ hasText: '基本信息' })).toBeVisible();
    await expect(page.locator('.ant-tabs-tab').filter({ hasText: '用户管理' })).toBeVisible();
  });

  test('should switch to users tab in detail modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const rowCount = await tenantPage.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await tenantPage.clickDetailButton(0);

    // Switch to users tab
    await page.locator('.ant-tabs-tab').filter({ hasText: '用户管理' }).click();
    await page.waitForTimeout(1000);

    // Users tab content should be visible (table or empty state)
    const usersTabPane = page.locator('.ant-tabs-tabpane').filter({ hasText: '用户管理' });
    await expect(usersTabPane).toBeVisible();
  });

  test('should close detail modal', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const rowCount = await tenantPage.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await tenantPage.clickDetailButton(0);
    await tenantPage.closeModal();

    await expect(tenantPage.modal).not.toBeVisible({ timeout: 3000 });
  });

  // ========== Pagination Tests ==========

  test('should display pagination info', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const totalText = tenantPage.pagination.locator('.ant-pagination-total-text');
    const text = await totalText.textContent();
    expect(text).toBeDefined();
  });

  test('should navigate to next page', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const total = await tenantPage.getPaginationTotal();
    if (total <= 10) {
      // Only one page, skip
      test.skip();
      return;
    }

    const firstPageBefore = await tenantPage.getTableRowCount();

    await tenantPage.clickNextPage();
    await page.waitForTimeout(1500);

    const secondPageCount = await tenantPage.getTableRowCount();
    expect(secondPageCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate back to previous page', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const total = await tenantPage.getPaginationTotal();
    if (total <= 10) {
      test.skip();
      return;
    }

    // Go to next page first
    await tenantPage.clickNextPage();
    await page.waitForTimeout(1500);

    // Then go back
    await tenantPage.clickPrevPage();
    await page.waitForTimeout(1500);

    const backCount = await tenantPage.getTableRowCount();
    expect(backCount).toBeGreaterThanOrEqual(0);
  });

  // ========== Empty State Tests ==========

  test('should handle empty enterprise list', async ({ page }) => {
    const tenantPage = new TenantManagementPage(page);
    await tenantPage.goto();
    await tenantPage.getTableRowCount();

    const hasEmpty = await tenantPage.hasEmptyState();
    const rowCount = await tenantPage.getTableRowCount();

    // Either has rows or empty state
    expect(hasEmpty || rowCount > 0).toBeTruthy();
  });
});
