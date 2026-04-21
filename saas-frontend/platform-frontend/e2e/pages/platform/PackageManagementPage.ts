import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class PackageManagementPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly refreshButton: Locator;
  readonly table: Locator;
  readonly createModal: Locator;
  readonly editModal: Locator;
  readonly productConfigModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h2').filter({ hasText: '套餐管理' });
    this.createButton = page.locator('button').filter({ hasText: '创建套餐' });
    this.refreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.table = page.locator('.ant-table');
    this.createModal = page.locator('.ant-modal').filter({ hasText: '创建套餐' });
    this.editModal = page.locator('.ant-modal').filter({ hasText: '编辑套餐' });
    this.productConfigModal = page.locator('.ant-modal').filter({ hasText: '配置产品' });
  }

  async goto() {
    const menuItem = this.page.getByRole('menuitem', { name: '套餐管理' });
    if (await menuItem.isVisible()) {
      await menuItem.click();
      await this.page.waitForURL('**/packages', { timeout: 10000 });
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.page.goto(`${BASE_URL}/packages`);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.table).toBeVisible();
  }

  async createPackage(name: string, code: string, description?: string) {
    await this.createButton.click();
    await expect(this.createModal).toBeVisible();

    await this.createModal.locator('input[placeholder*="pro"]').fill(code);
    await this.createModal.locator('input[placeholder*="专业版"]').fill(name);
    if (description) {
      await this.createModal.locator('textarea[placeholder*="描述"]').fill(description);
    }
    await this.createModal.locator('button[type="submit"]').click();
  }

  async editPackage(name: string, newName: string, newDescription?: string) {
    const row = this.table.locator('tr').filter({ hasText: name });
    await row.locator('button').filter({ hasText: '编辑' }).click();
    await expect(this.editModal).toBeVisible();
    await this.editModal.locator('input[placeholder*="套餐名称"]').clear();
    await this.editModal.locator('input[placeholder*="套餐名称"]').fill(newName);
    if (newDescription) {
      await this.editModal.locator('textarea[placeholder*="描述"]').clear();
      await this.editModal.locator('textarea[placeholder*="描述"]').fill(newDescription);
    }
    await this.editModal.locator('button[type="submit"]').click();
  }

  async toggleStatus(name: string) {
    const row = this.table.locator('tr').filter({ hasText: name });
    const toggleBtn = row.locator('button').filter({ hasText: /启用|禁用/ });
    await toggleBtn.click();
    const confirmBtn = this.page.locator('.ant-popconfirm').locator('button').filter({ hasText: '确认' });
    await confirmBtn.click();
  }

  async deletePackage(name: string) {
    const row = this.table.locator('tr').filter({ hasText: name });
    await row.locator('button').filter({ hasText: '删除' }).click();
    const confirmBtn = this.page.locator('.ant-popconfirm').locator('button').filter({ hasText: '确认' });
    await confirmBtn.click();
  }

  async openProductConfig(name: string) {
    const row = this.table.locator('tr').filter({ hasText: name });
    await row.locator('button').filter({ hasText: '配置产品' }).click();
    await expect(this.productConfigModal).toBeVisible();
  }

  async selectProductInModal(productName: string) {
    const checkbox = this.productConfigModal.locator('.ant-checkbox-wrapper').filter({ hasText: productName });
    if (await checkbox.isVisible()) {
      await checkbox.click();
    }
  }

  async saveProductConfig() {
    const okBtn = this.productConfigModal.locator('.ant-modal-footer button').filter({ hasText: /确\s*定/ });
    await okBtn.click();
  }

  async expandProductInConfig(productName: string) {
    const panelHeader = this.productConfigModal.locator('.ant-collapse-item-header').filter({ hasText: productName });
    if (await panelHeader.isVisible()) {
      await panelHeader.click();
    }
  }

  async toggleFeatureInConfig(productName: string, featureName: string) {
    // Find the Switch for the feature within the expanded product panel
    const panel = this.productConfigModal.locator('.ant-collapse-content').filter({ hasText: featureName });
    const switchEl = panel.locator('.ant-switch').first();
    if (await switchEl.isVisible()) {
      await switchEl.click();
    }
  }

  async saveProductFeatures() {
    const saveBtn = this.productConfigModal.locator('button').filter({ hasText: '保存该产品功能点' });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }
  }

  async hasPackage(name: string): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.table.locator('tr').filter({ hasText: name }).count() > 0;
  }
}
