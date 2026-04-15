import { test, expect } from '@playwright/test';
import { RulesPage } from '../../pages/enterprise/RulesPage';

test.describe('企业后台 - 规则配置', () => {
  let rulesPage: RulesPage;

  test.beforeEach(async ({ page }) => {
    rulesPage = new RulesPage(page);
    await rulesPage.goto();
  });

  test('RUL-001: 规则列表展示', async () => {
    await expect(rulesPage.table).toBeVisible();
  });

  test('RUL-002: 规则启用/停用', async () => {
    const count = await rulesPage.getRuleCount();
    if (count > 0) {
      await rulesPage.toggleRule(0);
    }
  });
});
