import { test, expect } from '@playwright/test';
import { SystemManagementPage } from '../../pages/platform/SystemManagementPage';

test.describe('平台后台 - 系统管理', () => {
  let systemPage: SystemManagementPage;

  test.beforeEach(async ({ page }) => {
    systemPage = new SystemManagementPage(page);
    await systemPage.goto();
  });

  test('SM-001: 系统管理页面加载', async () => {
    await expect(systemPage.page.locator('h2').filter({ hasText: '系统管理' })).toBeVisible();
  });

  test('SM-002: Tab切换功能', async () => {
    const tabs = await systemPage.tabs.all();
    if (tabs.length > 1) {
      const tabText = await tabs[1].textContent();
      if (tabText) {
        await systemPage.switchToTab(tabText);
      }
    }
  });
});
