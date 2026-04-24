import { Page, Locator, expect } from '@playwright/test';
import { BASE_URL } from '../../config';

export class ProductManagementPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createWizardButton: Locator;
  readonly quickCreateButton: Locator;
  readonly refreshButton: Locator;
  readonly categoryFilter: Locator;
  readonly table: Locator;
  readonly wizardModal: Locator;
  readonly wizardSteps: Locator;
  readonly wizardNextButton: Locator;
  readonly wizardPrevButton: Locator;
  readonly wizardCancelButton: Locator;
  readonly wizardFinishButton: Locator;
  readonly quickCreateModal: Locator;
  readonly successModal: Locator;
  readonly featureConfigModal: Locator;
  readonly detailDrawer: Locator;
  readonly ruleNodeConfigModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1').filter({ hasText: '产品管理' });
    this.createWizardButton = page.locator('button').filter({ hasText: '配置产品' });
    this.quickCreateButton = page.locator('button').filter({ hasText: '快速创建' });
    this.refreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.categoryFilter = page.locator('.ant-select').first();
    this.table = page.locator('.ant-table');
    this.wizardModal = page.locator('.ant-modal').filter({ hasText: '配置产品' });
    this.wizardSteps = page.locator('.ant-steps');
    this.wizardNextButton = page.locator('button').filter({ hasText: '下一步' });
    this.wizardPrevButton = page.locator('button').filter({ hasText: '上一步' });
    this.wizardCancelButton = this.wizardModal.locator('button').filter({ hasText: /取\s*消/ });
    this.wizardFinishButton = page.locator('button').filter({ hasText: '确认创建' });
    this.quickCreateModal = page.locator('.ant-modal').filter({ hasText: '快速创建产品' });
    this.successModal = page.locator('.ant-modal').filter({ hasText: '产品创建成功' });
    this.featureConfigModal = page.locator('.ant-modal').filter({ hasText: '配置功能点' });
    this.detailDrawer = page.locator('.ant-drawer');
    this.ruleNodeConfigModal = page.locator('.ant-modal').filter({ hasText: '配置规则节点' });
  }

  async goto() {
    // Use sidebar menu click for client-side navigation (avoids full page reload race)
    const menuItem = this.page.getByRole('menuitem', { name: '产品管理' });
    if (await menuItem.isVisible()) {
      await menuItem.click();
      await this.page.waitForURL('**/features/products', { timeout: 10000 });
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.page.goto(`${BASE_URL}/features/products`);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
    await expect(this.table).toBeVisible({ timeout: 10000 });
  }

  async openWizard() {
    await this.createWizardButton.click();
    await expect(this.wizardModal).toBeVisible();
    await expect(this.wizardSteps).toBeVisible();
  }

  async fillBasicInfo(code: string, name: string, category: string, description?: string) {
    await this.page.fill('input[placeholder*="如: stairs_basic"]', code);
    await this.page.fill('input[placeholder*="请输入产品名称"]', name);

    // Select category
    const selectInWizard = this.wizardModal.locator('.ant-select-selector');
    await selectInWizard.click();
    await this.page.locator('.ant-select-item').filter({ hasText: category }).click();

    if (description) {
      await this.wizardModal.locator('textarea[placeholder*="描述"]').fill(description);
    }
  }

  async selectTrigger(triggerText: string) {
    // Click the module card that matches the trigger
    const card = this.wizardModal.locator('.ant-card').filter({ hasText: triggerText }).first();
    await card.click();
  }

  async moveRuleUp(index: number) {
    const upButtons = this.wizardModal.locator('button[aria-label*="up"], button').filter({ hasText: '' });
    const ruleItems = this.wizardModal.locator('[class*="ant-"]').filter({ hasText: '配置' });
    // Use the up arrow buttons in the current rule chain
    const arrowUpButtons = this.page.locator('.anticon-arrow-up').locator('..');
    if ((await arrowUpButtons.count()) > index) {
      await arrowUpButtons.nth(index).click();
    }
  }

  async moveRuleDown(index: number) {
    const arrowDownButtons = this.page.locator('.anticon-arrow-down').locator('..');
    if ((await arrowDownButtons.count()) > index) {
      await arrowDownButtons.nth(index).click();
    }
  }

  async configureRuleNode(nodeName: string) {
    // Find the "配置" button near the node in the wizard rule chain
    const configButton = this.wizardModal.locator('button').filter({ hasText: '配置' });
    const count = await configButton.count();
    for (let i = 0; i < count; i++) {
      const btn = configButton.nth(i);
      const parent = btn.locator('..').locator('..');
      if ((await parent.textContent())?.includes(nodeName)) {
        await btn.click();
        await expect(this.ruleNodeConfigModal).toBeVisible();
        return;
      }
    }
  }

  async removeRuleNode(nodeName: string) {
    const removeButtons = this.wizardModal.locator('button').filter({ hasText: '移除' });
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = removeButtons.nth(i);
      const parent = btn.locator('..').locator('..');
      if ((await parent.textContent())?.includes(nodeName)) {
        await btn.click();
        return;
      }
    }
  }

  async addAvailableRuleNode(nodeName: string) {
    const addButtons = this.wizardModal.locator('button').filter({ hasText: '添加' });
    const count = await addButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = addButtons.nth(i);
      const parent = btn.locator('..').locator('..');
      if ((await parent.textContent())?.includes(nodeName)) {
        await btn.click();
        return;
      }
    }
  }

  async toggleFeature(featureName: string) {
    // Click on the feature item row to toggle selection
    const featureItems = this.wizardModal.locator('div').filter({ hasText: featureName });
    const count = await featureItems.count();
    for (let i = 0; i < count; i++) {
      const item = featureItems.nth(i);
      const text = await item.textContent();
      if (text?.includes(featureName) && !text.includes('配置产品') && !text.includes('本向导')) {
        await item.click();
        return;
      }
    }
  }

  async clickNext() {
    await this.wizardNextButton.click();
  }

  async clickPrev() {
    await this.wizardPrevButton.click();
  }

  async clickFinish() {
    await this.wizardFinishButton.click();
  }

  async quickCreate(code: string, name: string, category: string, description?: string) {
    await this.quickCreateButton.click();
    await expect(this.quickCreateModal).toBeVisible();

    await this.quickCreateModal.locator('input[placeholder*="如: stairs_basic"]').fill(code);
    await this.quickCreateModal.locator('input[placeholder*="请输入产品名称"]').fill(name);

    const selectInModal = this.quickCreateModal.locator('.ant-select-selector');
    await selectInModal.click();
    await this.page.locator('.ant-select-item').filter({ hasText: category }).click();

    if (description) {
      await this.quickCreateModal.locator('textarea[placeholder*="描述"]').fill(description);
    }

    await this.quickCreateModal.locator('button[type="submit"]').click();
  }

  async openProductDetail(productName: string) {
    const row = this.table.locator('tr').filter({ hasText: productName });
    await row.locator('button').filter({ hasText: '详情' }).click();
    await expect(this.detailDrawer).toBeVisible();
  }

  async editProduct(productName: string, newName: string) {
    const row = this.table.locator('tr').filter({ hasText: productName });
    await row.locator('button').filter({ hasText: '编辑' }).click();
    const editModal = this.page.locator('.ant-modal').filter({ hasText: '编辑产品' });
    await expect(editModal).toBeVisible();
    await editModal.locator('input[placeholder*="请输入产品名称"]').clear();
    await editModal.locator('input[placeholder*="请输入产品名称"]').fill(newName);
    await editModal.locator('button[type="submit"]').click();
  }

  async configureFeatures(productName: string) {
    const row = this.table.locator('tr').filter({ hasText: productName });
    await row.locator('button').filter({ hasText: '配置功能' }).click();
    await expect(this.featureConfigModal).toBeVisible();
  }

  async deleteProduct(productName: string) {
    const row = this.table.locator('tr').filter({ hasText: productName });
    await row.locator('button').filter({ hasText: '删除' }).click();
    // Confirm in Popconfirm
    const confirmBtn = this.page.locator('.ant-popconfirm').locator('button').filter({ hasText: /确\s*认/ });
    await confirmBtn.click();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.click();
    await this.page.locator('.ant-select-item').filter({ hasText: category }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clearFilter() {
    const clear = this.page.locator('.ant-select-clear');
    if (await clear.isVisible()) {
      await clear.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async hasProduct(name: string): Promise<boolean> {
    await this.page.waitForLoadState('networkidle');
    return this.table.locator('tr').filter({ hasText: name }).count() > 0;
  }
}
