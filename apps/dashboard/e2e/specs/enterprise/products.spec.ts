import { test, expect } from '@playwright/test';
import { ProductsPage } from '../../pages/enterprise/ProductsPage';

test.describe('企业后台 - 商品管理', () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.goto();
  });

  test('PRD-001: 产品列表展示', async () => {
    await expect(productsPage.table).toBeVisible();
  });

  test('PRD-002: 产品上下架功能', async () => {
    const count = await productsPage.getProductCount();
    if (count > 0) {
      await productsPage.toggleProductStatus(0);
    }
  });
});
