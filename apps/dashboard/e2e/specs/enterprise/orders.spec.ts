import { test, expect } from '@playwright/test';
import { OrdersPage } from '../../pages/enterprise/OrdersPage';

test.describe('企业后台 - 订单管理', () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
    await ordersPage.goto();
  });

  test('ORD-001: 订单列表展示', async () => {
    await expect(ordersPage.table).toBeVisible();
  });

  test('ORD-002: 订单状态筛选', async () => {
    await ordersPage.filterByStatus('pending');
    await ordersPage.page.waitForTimeout(1000);
  });

  test('ORD-003: 订单数量大于0', async () => {
    const count = await ordersPage.getOrderCount();
    expect(count).toBeGreaterThan(0);
  });
});
