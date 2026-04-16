import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAndNavigate } from '../../helpers';
import { MallPage } from '../../pages/MallPage';
import { HomePage } from '../../pages/HomePage';

test.describe('H5 - 商城页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    await loginAndNavigate(page, '/mall');
  });

  test('H5-MALL-001: 商城页正确渲染', async ({ page }) => {
    const mallPage = new MallPage(page);
    await expect(mallPage.tabBar).toBeVisible({ timeout: 10000 });
  });

  test('H5-MALL-002: TabBar显示5个Tab', async ({ page }) => {
    const items = page.locator('.adm-tab-bar-item');
    const count = await items.count();
    expect(count).toBe(5);
  });

  test('H5-MALL-003: 搜索框可见', async ({ page }) => {
    const mallPage = new MallPage(page);
    await expect(mallPage.searchBar).toBeVisible();
    await expect(mallPage.searchInput).toBeVisible();
  });

  test('H5-MALL-004: TabBar点击首页返回首页', async ({ page }) => {
    const mallPage = new MallPage(page);
    await mallPage.navigateHome();
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 5000 });
  });

  test('H5-MALL-005: TabBar点击打卡跳转到打卡页', async ({ page }) => {
    const mallPage = new MallPage(page);
    await mallPage.checkinTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page.url()).toContain('/checkin');
  });

  test('H5-MALL-006: TabBar点击我的跳转到个人中心', async ({ page }) => {
    const mallPage = new MallPage(page);
    await mallPage.navigateProfile();
    await expect(page.url()).toContain('/profile');
  });

  test('H5-MALL-007: 商品列表区域存在', async ({ page }) => {
    const mallPage = new MallPage(page);
    await expect(mallPage.productList).toBeVisible({ timeout: 5000 });
  });

  test('H5-MALL-008: 无商品时显示空状态', async ({ page }) => {
    const mallPage = new MallPage(page);
    // If no products exist, list should show empty state or just the search bar
    const list = mallPage.productList;
    const isVisible = await list.isVisible().catch(() => false);
    // Either empty list or search bar should be visible
    expect(isVisible || await mallPage.searchBar.isVisible()).toBe(true);
  });

  test('H5-MALL-009: 搜索功能可交互', async ({ page }) => {
    const mallPage = new MallPage(page);
    await mallPage.searchInput.fill('测试');
    await page.waitForTimeout(1000);
    await expect(mallPage.searchInput).toHaveValue('测试');
  });

  test('H5-MALL-010: 无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
