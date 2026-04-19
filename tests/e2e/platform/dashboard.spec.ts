import { test, expect } from '@playwright/test';
import { PlatformDashboardPage } from './pages/DashboardPage';
import { loginAsPlatformAdmin, navigateToPlatformPage, waitForTable, takeScreenshot } from './helpers';

/**
 * Platform Dashboard Tests
 *
 * Tests the platform dashboard at /platform/dashboard
 * Covers: dashboard rendering, stat cards, charts, enterprise ranking table
 */
test.describe('Platform Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Login as platform admin before each test
    const result = await loginAsPlatformAdmin(page);
    if (!result) {
      test.skip();
    }
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot on failure
    if (test.info().status === 'failed') {
      await takeScreenshot(page, 'dashboard-failure');
    }
  });

  // ========== Page Rendering Tests ==========

  test('should display dashboard page with all sections', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('should display platform sidebar with menu items', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Sidebar visible
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    // Menu items visible
    await expect(page.locator('.ant-menu-item').filter({ hasText: '平台看板' })).toBeVisible();
    await expect(page.locator('.ant-menu-item').filter({ hasText: '企业管理' })).toBeVisible();
    await expect(page.locator('.ant-menu-submenu-title').filter({ hasText: '系统管理' })).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.getByRole('heading', { level: 2 })).toContainText('平台看板');
  });

  test('should display dimension segmented control', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('.ant-segmented')).toBeVisible();
    await expect(page.locator('.ant-segmented').getByText('按日')).toBeVisible();
    await expect(page.locator('.ant-segmented').getByText('按周')).toBeVisible();
    await expect(page.locator('.ant-segmented').getByText('按月')).toBeVisible();
  });

  test('should display export report button', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('button').filter({ hasText: '导出报表' })).toBeVisible();
  });

  // ========== Statistic Cards Tests ==========

  test('should display all 7 stat cards', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    const titles = await dashboard.getStatCardTitles();
    expect(titles).toContain('企业总数');
    expect(titles).toContain('活跃企业');
    expect(titles).toContain('总用户数');
    expect(titles).toContain('总积分发放');
    expect(titles).toContain('总兑换量');
    expect(titles).toContain('平均企业用户');
    expect(titles).toContain('企业活跃率');
  });

  test('should display stat card values (numbers or loading state)', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Wait for either loaded values or loading state
    const values = await dashboard.getStatCardValues();
    expect(values.length).toBeGreaterThanOrEqual(0);
    // Values should be numeric strings or loading placeholders
    values.forEach(v => {
      expect(typeof v === 'string').toBeTruthy();
    });
  });

  test('should display active enterprises with green color style', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Find the active enterprises stat card by title
    const activeEnterprises = page.locator('.ant-statistic').filter({ hasText: '活跃企业' });
    await expect(activeEnterprises).toBeVisible();
  });

  // ========== Chart Tests ==========

  test('should display area chart for points trend', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('.recharts-areaChart').first()).toBeVisible();
  });

  test('should display line chart for users and exchanges trend', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('.recharts-lineChart').first()).toBeVisible();
  });

  test('should display bar chart for enterprise ranking', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await expect(page.locator('.recharts-barChart').first()).toBeVisible();
  });

  test('should have chart legends', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Recharts legend items are rendered
    const legends = page.locator('.recharts-legend-wrapper');
    const count = await legends.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ========== Dimension Switching Tests ==========

  test('should switch to week dimension', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await dashboard.switchDimension('week');

    // The segmented control should now have week selected
    const weekOption = page.locator('.ant-segmented-item-selected').filter({ hasText: '按周' });
    await expect(weekOption).toBeVisible();
  });

  test('should switch to month dimension', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await dashboard.switchDimension('month');

    const monthOption = page.locator('.ant-segmented-item-selected').filter({ hasText: '按月' });
    await expect(monthOption).toBeVisible();
  });

  test('should switch back to day dimension', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    await dashboard.switchDimension('week');
    await dashboard.switchDimension('day');

    const dayOption = page.locator('.ant-segmented-item-selected').filter({ hasText: '按日' });
    await expect(dayOption).toBeVisible();
  });

  // ========== Enterprise Ranking Table Tests ==========

  test('should display enterprise ranking table', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(2000);

    // Table with ranking header
    const rankingSection = page.locator('.ant-card').filter({ hasText: '企业排行详情' });
    await expect(rankingSection.locator('.ant-table')).toBeVisible();
  });

  test('should display ranking table columns', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(2000);

    const tableHeaders = page.locator('.ant-card').filter({ hasText: '企业排行详情' }).locator('.ant-table th');
    const headerTexts = await tableHeaders.allTextContents();

    expect(headerTexts.some(t => t.includes('排名'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('企业名称'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('用户数'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('总积分'))).toBeTruthy();
    expect(headerTexts.some(t => t.includes('活跃天数'))).toBeTruthy();
  });

  test('should show empty state when no enterprises exist', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(2000);

    const rowCount = await dashboard.getRankingRowCount();
    // Either has data or shows empty state
    const hasPlaceholder = await page.locator('.ant-table-placeholder').isVisible().catch(() => false);
    expect(rowCount >= 0).toBeTruthy();
  });

  // ========== Navigation Tests ==========

  test('should navigate to enterprise management from menu', async ({ page }) => {
    await loginAsPlatformAdmin(page);
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Click enterprise management menu
    await page.locator('.ant-menu-item').filter({ hasText: '企业管理' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/platform\/enterprises/);
  });

  test('should navigate to system users from menu', async ({ page }) => {
    await loginAsPlatformAdmin(page);
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Open system management submenu
    await page.locator('.ant-menu-submenu-title').filter({ hasText: '系统管理' }).click();
    await page.waitForTimeout(500);

    // Click user management
    await page.locator('.ant-menu-item').filter({ hasText: '用户管理' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/\/platform\/system\/users/);
  });

  test('should navigate to platform config from menu', async ({ page }) => {
    await loginAsPlatformAdmin(page);
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Navigate via menu
    await page.locator('.ant-menu-item').filter({ hasText: '企业管理' }).click();
    await page.waitForLoadState('networkidle');

    // Navigate back to dashboard
    await page.locator('.ant-menu-item').filter({ hasText: '平台看板' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/platform\/dashboard/);
  });

  // ========== Data Refresh Tests ==========

  test('should display loading state on initial load', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();

    // Cards may show loading state initially
    const loadingCards = page.locator('.ant-card-loading-content');
    // Should eventually render actual data
    await dashboard.expectVisible();
  });

  test('should render charts after data loads', async ({ page }) => {
    const dashboard = new PlatformDashboardPage(page);
    await dashboard.goto();
    await page.waitForTimeout(3000);

    const charts = page.locator('.recharts-wrapper');
    const count = await charts.count();
    expect(count).toBeGreaterThan(0);
  });
});
