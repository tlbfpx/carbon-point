import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PlatformConfigPage {
  readonly page: Page;
  readonly form: Locator;
  readonly saveButton: Locator;
  readonly heading: Locator;
  readonly tabs: Locator;
  readonly basicTab: Locator;
  readonly notificationTab: Locator;
  readonly pointsTab: Locator;
  readonly featureTab: Locator;
  readonly integrationTab: Locator;
  readonly systemTab: Locator;
  readonly templateTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('.ant-form');
    this.saveButton = page.locator('button').filter({ hasText: '保存' });
    this.heading = page.locator('h2').filter({ hasText: '平台配置' });
    this.tabs = page.locator('.ant-tabs-tab');
    this.basicTab = page.locator('.ant-tabs-tab').filter({ hasText: '基础配置' });
    this.notificationTab = page.locator('.ant-tabs-tab').filter({ hasText: '通知设置' });
    this.pointsTab = page.locator('.ant-tabs-tab').filter({ hasText: '积分规则' });
    this.featureTab = page.locator('.ant-tabs-tab').filter({ hasText: '功能开关' });
    this.integrationTab = page.locator('.ant-tabs-tab').filter({ hasText: '第三方集成' });
    this.systemTab = page.locator('.ant-tabs-tab').filter({ hasText: '系统设置' });
    this.templateTab = page.locator('.ant-tabs-tab').filter({ hasText: '规则模板' });
  }

  async goto() {
    const menuItem = this.page.getByRole('menuitem', { name: '平台配置' });
    if (await menuItem.isVisible()) {
      await menuItem.click();
      await this.page.waitForURL('**/config', { timeout: 10000 });
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.page.goto(`${BASE_URL}/config`);
      await this.form.waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.form).toBeVisible();
  }

  async fillConfigField(label: string, value: string) {
    const field = this.form.locator('.ant-form-item').filter({ hasText: label }).locator('input');
    await field.fill(value);
  }

  async save() {
    await this.saveButton.click();
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 5000 });
  }

  async switchTab(tabName: string) {
    const tab = this.page.locator('.ant-tabs-tab').filter({ hasText: tabName });
    await tab.click();
  }

  async toggleFeatureFlag(flagLabel: string) {
    const flagCards = this.page.locator('div').filter({ hasText: new RegExp(flagLabel) });
    const count = await flagCards.count();
    for (let i = 0; i < count; i++) {
      const card = flagCards.nth(i);
      const switchEl = card.locator('.ant-switch');
      if (await switchEl.isVisible()) {
        await switchEl.click();
        return;
      }
    }
  }

  async createRuleTemplate(name: string, description?: string) {
    const createBtn = this.page.locator('button').filter({ hasText: '新建模板' });
    await createBtn.click();
    const modal = this.page.locator('.ant-modal').filter({ hasText: '新建规则模板' });
    await expect(modal).toBeVisible();
    await modal.locator('input[placeholder*="模板名称"]').fill(name);
    if (description) {
      await modal.locator('textarea[placeholder*="模板描述"]').fill(description);
    }
    await modal.locator('button[type="submit"]').click();
  }

  async editRuleTemplate(name: string) {
    const table = this.page.locator('.ant-table');
    const row = table.locator('tr').filter({ hasText: name });
    await row.locator('button').filter({ hasText: '编辑' }).click();
  }

  async deleteRuleTemplate(name: string) {
    const table = this.page.locator('.ant-table');
    const row = table.locator('tr').filter({ hasText: name });
    await row.locator('button').filter({ hasText: '删除' }).click();
    const confirmBtn = this.page.locator('.ant-popconfirm').locator('button').filter({ hasText: '确认' });
    await confirmBtn.click();
  }
}
