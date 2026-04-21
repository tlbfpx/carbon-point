import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class BlockLibraryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly modulesOverview: Locator;
  readonly tabs: Locator;
  readonly triggerTab: Locator;
  readonly ruleNodeTab: Locator;
  readonly featureTab: Locator;
  readonly triggerTable: Locator;
  readonly ruleNodeTable: Locator;
  readonly featureTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2').filter({ hasText: '积木组件库' });
    this.modulesOverview = page.locator('.ant-card').filter({ hasText: '已注册产品模块' });
    this.tabs = page.locator('.ant-tabs-tab');
    this.triggerTab = page.locator('.ant-tabs-tab').filter({ hasText: '触发器' });
    this.ruleNodeTab = page.locator('.ant-tabs-tab').filter({ hasText: '规则节点' });
    this.featureTab = page.locator('.ant-tabs-tab').filter({ hasText: '功能点模板' });
    this.triggerTable = page.locator('.ant-table').first();
    this.ruleNodeTable = page.locator('.ant-table').nth(1);
    this.featureTable = page.locator('.ant-table').nth(2);
  }

  async goto() {
    const menuItem = this.page.getByRole('menuitem', { name: '积木组件库' });
    if (await menuItem.isVisible()) {
      await menuItem.click();
      await this.page.waitForURL('**/features/blocks', { timeout: 10000 });
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.page.goto(`${BASE_URL}/features/blocks`);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.modulesOverview).toBeVisible();
  }

  async clickTriggerTab() {
    await this.triggerTab.click();
  }

  async clickRuleNodeTab() {
    await this.ruleNodeTab.click();
  }

  async clickFeatureTab() {
    await this.featureTab.click();
  }

  async getModuleCount(): Promise<number> {
    return this.modulesOverview.locator('.ant-card-hoverable').count();
  }

  async getTriggerRowCount(): Promise<number> {
    return this.triggerTable.locator('.ant-table-tbody tr').count();
  }

  async getRuleNodeRowCount(): Promise<number> {
    return this.ruleNodeTable.locator('.ant-table-tbody tr').count();
  }

  async getFeatureRowCount(): Promise<number> {
    return this.featureTable.locator('.ant-table-tbody tr').count();
  }
}
