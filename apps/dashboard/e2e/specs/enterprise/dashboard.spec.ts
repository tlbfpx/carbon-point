import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAsEnterpriseAdmin } from '../../helpers';

test.describe('企业后台 - 数据看板', () => {
  test('DASH-001: 登录后进入看板', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    // 直接验证登录成功 - 侧边栏可见
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    await expect(page.locator('text=数据看板')).toBeVisible();
  });

  test('DASH-002: 侧边栏菜单完整', async ({ page }) => {
    await loginAsEnterpriseAdmin(page, BASE_URL);
    // 验证所有菜单项
    await expect(page.locator('text=员工管理')).toBeVisible();
    await expect(page.locator('text=规则配置')).toBeVisible();
    await expect(page.locator('text=商品管理')).toBeVisible();
    await expect(page.locator('text=订单管理')).toBeVisible();
    await expect(page.locator('text=积分运营')).toBeVisible();
    await expect(page.locator('text=数据报表')).toBeVisible();
    await expect(page.locator('text=角色权限')).toBeVisible();
  });
});
