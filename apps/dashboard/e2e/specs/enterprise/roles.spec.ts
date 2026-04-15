import { test, expect } from '@playwright/test';
import { RolesPage } from '../../pages/enterprise/RolesPage';

function uniqueId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test.describe('企业后台 - 角色权限', () => {
  let rolesPage: RolesPage;

  test.beforeEach(async ({ page }) => {
    rolesPage = new RolesPage(page);
    await rolesPage.goto();
  });

  test('ROL-001: 角色列表展示', async () => {
    await expect(rolesPage.table).toBeVisible();
  });

  test('ROL-002: 新增自定义角色', async () => {
    await rolesPage.clickAddRole();
    const testName = `测试角色${uniqueId()}`;
    await rolesPage.fillRoleForm(testName, '自动化测试描述');
    await rolesPage.submitRole();
    await rolesPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });
});
