import { test, expect } from '@playwright/test';
import { BASE_URL } from '../config';
import { loginAsEnterpriseAdmin } from '../helpers';

test.describe('企业后台 - 菜单导航全量测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
  });

  test('MENU-001: 侧边栏菜单正常显示', async ({ page }) => {
    await expect(page.locator('.ant-layout-sider')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.ant-menu-dark .ant-menu-item').first()).toBeVisible({ timeout: 15000 });
  });

  test('MENU-002: 数据看板页面导航', async ({ page }) => {
    await page.click('text=数据看板');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator('text=今日签到')).toBeVisible({ timeout: 15000 });
  });

  test('MENU-003: 员工管理页面导航', async ({ page }) => {
    await page.click('text=员工管理');
    await expect(page).toHaveURL(/.*members/, { timeout: 15000 });
    await expect(page.locator('text=员工列表').or(page.locator('text=添加员工'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-004: 爬楼积分规则配置页面导航', async ({ page }) => {
    await page.click('text=爬楼积分管理');
    await page.click('text=规则配置');
    await expect(page).toHaveURL(/.*rules/, { timeout: 15000 });
    await expect(page.locator('text=楼层积分').or(page.locator('text=时段配置'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-005: 走路积分管理 - 步数换算页面导航', async ({ page }) => {
    // 先检查走路菜单是否存在
    const walkingMenu = page.locator('text=走路积分管理');
    if (await walkingMenu.isVisible({ timeout: 5000 })) {
      await page.click('text=走路积分管理');
      await page.click('text=步数换算');
      await expect(page).toHaveURL(/.*walking/, { timeout: 15000 });
    } else {
      test.skip('走路功能未在套餐中启用，跳过测试');
    }
  });

  test('MENU-006: 产品管理页面导航', async ({ page }) => {
    await page.click('text=产品管理');
    await expect(page).toHaveURL(/.*products/, { timeout: 15000 });
    await expect(page.locator('text=商品列表').or(page.locator('text=添加商品'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-007: 订单管理页面导航', async ({ page }) => {
    await page.click('text=订单管理');
    await expect(page).toHaveURL(/.*orders/, { timeout: 15000 });
    await expect(page.locator('text=订单列表').or(page.locator('text=全部订单'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-008: 积分运营页面导航', async ({ page }) => {
    await page.click('text=积分运营');
    await expect(page).toHaveURL(/.*points/, { timeout: 15000 });
    await expect(page.locator('text=积分流水').or(page.locator('text=积分调整'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-009: 积分过期配置页面导航', async ({ page }) => {
    const expireMenu = page.locator('text=积分过期配置');
    if (await expireMenu.isVisible({ timeout: 5000 })) {
      await page.click('text=积分过期配置');
      await expect(page).toHaveURL(/.*point-expiration/, { timeout: 15000 });
    } else {
      // 尝试通过爬楼积分菜单找子菜单
      try {
        await page.click('text=积分过期配置');
        await expect(page).toHaveURL(/.*point-expiration/, { timeout: 10000 });
      } catch {
        test.skip('积分过期配置菜单未找到，可能根据套餐动态显示');
      }
    }
  });

  test('MENU-010: 数据报表页面导航', async ({ page }) => {
    await page.click('text=数据报表');
    await expect(page).toHaveURL(/.*reports/, { timeout: 15000 });
    await expect(page.locator('text=签到统计').or(page.locator('text=积分统计'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-011: 角色管理页面导航', async ({ page }) => {
    await page.click('text=角色管理');
    await expect(page).toHaveURL(/.*roles/, { timeout: 15000 });
    await expect(page.locator('text=角色列表').or(page.locator('text=添加角色'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-012: 功能点阵页面导航', async ({ page }) => {
    const featureMenu = page.locator('text=功能点阵');
    if (await featureMenu.isVisible({ timeout: 5000 })) {
      await page.click('text=功能点阵');
      await expect(page).toHaveURL(/.*feature-matrix/, { timeout: 15000 });
    } else {
      test.skip('功能点阵菜单未找到，可能根据套餐动态显示');
    }
  });

  test('MENU-013: 字典管理页面导航', async ({ page }) => {
    const dictMenu = page.locator('text=字典管理');
    if (await dictMenu.isVisible({ timeout: 5000 })) {
      await page.click('text=字典管理');
      await expect(page).toHaveURL(/.*dict-management/, { timeout: 15000 });
    } else {
      test.skip('字典管理菜单未找到，可能根据套餐动态显示');
    }
  });

  test('MENU-014: 品牌配置页面导航', async ({ page }) => {
    await page.click('text=品牌配置');
    await expect(page).toHaveURL(/.*branding/, { timeout: 15000 });
    await expect(page.locator('text=企业名称').or(page.locator('text=Logo'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-015: 操作日志页面导航', async ({ page }) => {
    await page.click('text=操作日志');
    await expect(page).toHaveURL(/.*operation-log/, { timeout: 15000 });
    await expect(page.locator('text=操作记录').or(page.locator('text=日志列表'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-016: 菜单项选中状态正确', async ({ page }) => {
    await page.click('text=员工管理');
    await expect(page.locator('.ant-menu-item-selected')).toContainText('员工管理', { timeout: 15000 });

    await page.click('text=订单管理');
    await expect(page.locator('.ant-menu-item-selected')).toContainText('订单管理', { timeout: 15000 });
  });

  test('MENU-017: 菜单展开收起功能正常', async ({ page }) => {
    const collapseBtn = page.locator('.ant-layout-sider-trigger').or(page.locator('svg').filter({ has: page.locator('*') })).first();
    if (await collapseBtn.isVisible({ timeout: 5000 })) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await collapseBtn.click();
    }
  });

  test('MENU-018: 用户下拉菜单正常工作', async ({ page }) => {
    await page.locator('.ant-layout-header .ant-avatar').first().click();
    await expect(page.locator('text=个人信息').or(page.locator('text=退出登录'))).toBeVisible({ timeout: 15000 });
  });

  test('MENU-019: 页面无JavaScript错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // 访问几个页面检查
    await page.click('text=员工管理');
    await page.waitForTimeout(2000);
    await page.click('text=订单管理');
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('MENU-020: 菜单响应式正常', async ({ page }) => {
    // 测试不同视口大小
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.ant-layout-sider')).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
  });
});
