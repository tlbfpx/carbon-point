import { test, expect } from '@playwright/test';
import { MemberPage } from '../../pages/enterprise/MemberPage';

function uniqueId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test.describe('企业后台 - 员工管理', () => {
  let memberPage: MemberPage;

  test.beforeEach(async ({ page }) => {
    memberPage = new MemberPage(page);
    await memberPage.goto();
  });

  test('MEM-001: 员工列表展示', async () => {
    await expect(memberPage.table).toBeVisible();
  });

  test('MEM-002: 添加员工', async () => {
    await memberPage.clickAddEmployee();
    const testName = `测试员工${uniqueId()}`;
    const testPhone = `138${Date.now().toString().slice(-8)}`;
    await memberPage.fillAddEmployeeForm(testName, testPhone);
    await memberPage.submitAddEmployee();
    await memberPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });

  test('MEM-003: 员工搜索', async () => {
    await memberPage.searchKeyword('测试');
    await memberPage.page.waitForTimeout(1000);
  });

  test('MEM-004: 批量导入按钮存在', async () => {
    await expect(memberPage.importButton).toBeVisible();
  });
});
