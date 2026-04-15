import { test, expect } from '@playwright/test';
import { EnterpriseManagementPage } from '../../pages/platform/EnterpriseManagementPage';

function uniqueId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test.describe('平台后台 - 企业管理', () => {
  let enterprisePage: EnterpriseManagementPage;

  test.beforeEach(async ({ page }) => {
    enterprisePage = new EnterpriseManagementPage(page);
    await enterprisePage.goto();
  });

  test('EM-001: 企业列表展示', async () => {
    await expect(enterprisePage.table).toBeVisible();
  });

  test('EM-002: 开通新企业', async () => {
    await enterprisePage.clickAddEnterprise();
    const testName = `测试企业${uniqueId()}`;
    await enterprisePage.fillEnterpriseForm(testName, '测试联系人', `138${Date.now().toString().slice(-8)}`);
    await enterprisePage.submitEnterprise();
    await enterprisePage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });

  test('EM-003: 企业状态切换', async () => {
    const count = await enterprisePage.getEnterpriseCount();
    if (count > 0) {
      await enterprisePage.toggleEnterpriseStatus(0);
    }
  });

  test('EM-004: 企业搜索', async () => {
    await enterprisePage.searchEnterprise('测试');
    await enterprisePage.page.waitForTimeout(1000);
  });
});
