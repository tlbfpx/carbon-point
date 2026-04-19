import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

export class SystemConfigPage {
  readonly page: Page;
  readonly featureSwitches: Locator;
  readonly featureSection: Locator;
  readonly ruleTemplateSection: Locator;
  readonly platformParamsSection: Locator;
  readonly saveFeatureFlagsButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.featureSwitches = page.locator('.ant-switch');
    this.featureSection = page.locator('.ant-card').filter({ hasText: '功能开关' });
    this.ruleTemplateSection = page.locator('.ant-card').filter({ hasText: '默认规则模板' });
    this.platformParamsSection = page.locator('.ant-card').filter({ hasText: '平台参数' });
    this.saveFeatureFlagsButton = page.locator('button').filter({ hasText: '保存功能开关' });
    this.modal = page.locator('.ant-modal');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/platform/config');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async getFeatureFlagLabels(): Promise<string[]> {
    // Each feature flag has a label text in a div
    const cards = this.featureSection.locator('[style*="justify-content: space-between"]');
    const count = await cards.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const label = await cards.nth(i).locator('div').first().textContent();
      labels.push(label || '');
    }
    return labels;
  }

  async toggleFeatureFlag(index: number): Promise<void> {
    const switches = this.featureSwitches;
    const count = await switches.count();
    if (index < count) {
      await switches.nth(index).click();
      await this.page.waitForTimeout(500);
    }
  }

  async saveFeatureFlags(): Promise<void> {
    await this.saveFeatureFlagsButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getRuleTemplateCount(): Promise<number> {
    const rows = this.ruleTemplateSection.locator('.ant-table-tbody tr');
    return rows.count();
  }

  async clickNewTemplate(): Promise<void> {
    const newBtn = this.ruleTemplateSection.locator('button').filter({ hasText: '新建模板' });
    await newBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillTemplateForm(data: { name: string; description?: string }): Promise<void> {
    const formItems = this.modal.locator('.ant-form-item');
    const nameInput = formItems.nth(0).locator('input');
    const descInput = formItems.nth(1).locator('textarea');

    await nameInput.fill(data.name);
    if (data.description) {
      await descInput.fill(data.description);
    }
  }

  async submitTemplate(): Promise<void> {
    await this.modal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async closeModal(): Promise<void> {
    const closeBtn = this.modal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  async hasEmptyTemplateState(): Promise<boolean> {
    return this.ruleTemplateSection.locator('text=暂无规则模板').isVisible();
  }

  async editFirstTemplate(): Promise<void> {
    const editBtn = this.ruleTemplateSection.locator('button').filter({ hasText: '编辑' }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await this.modal.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async deleteFirstTemplate(): Promise<void> {
    const deleteBtn = this.ruleTemplateSection.locator('button').filter({ hasText: '删除' }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await this.page.waitForTimeout(500);
      // Confirm deletion
      const confirmBtn = this.page.locator('.ant-popover .ant-btn-primary');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
        await this.page.waitForTimeout(1500);
      }
    }
  }

  async getParamValues(): Promise<Record<string, string>> {
    const inputNumbers = this.platformParamsSection.locator('.ant-input-number');
    const labels = this.platformParamsSection.locator('.ant-form-item-label label');
    const result: Record<string, string> = {};
    const labelCount = await labels.count();
    for (let i = 0; i < labelCount; i++) {
      const label = (await labels.nth(i).textContent()) || '';
      const value = await inputNumbers.nth(i).inputValue();
      result[label] = value;
    }
    return result;
  }

  async setParam(labelText: string, value: number): Promise<void> {
    const labels = this.platformParamsSection.locator('.ant-form-item-label label');
    const count = await labels.count();
    for (let i = 0; i < count; i++) {
      const label = (await labels.nth(i).textContent()) || '';
      if (label.includes(labelText)) {
        const inputNumber = this.platformParamsSection.locator('.ant-input-number').nth(i);
        await inputNumber.fill(String(value));
        break;
      }
    }
  }

  async saveParams(): Promise<void> {
    const saveBtn = this.platformParamsSection.locator('button').filter({ hasText: '保存参数' });
    await saveBtn.click();
    await this.page.waitForTimeout(2000);
  }
}

// ============ System Users Page ============

export class SystemUsersPage {
  readonly page: Page;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly createButton: Locator;
  readonly refreshButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.createButton = page.locator('button').filter({ hasText: '新增用户' });
    this.refreshButton = page.locator('button').filter({ hasText: '刷新' });
    this.modal = page.locator('.ant-modal');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/platform/system/users');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async openCreateModal(): Promise<void> {
    await this.createButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: {
    username: string;
    phone: string;
    password: string;
    email?: string;
    role?: string;
  }): Promise<void> {
    const formItems = this.modal.locator('.ant-form-item');
    // Fields in order: username, phone, password, email, role
    await formItems.nth(0).locator('input').fill(data.username);
    await formItems.nth(1).locator('input').fill(data.phone);
    await formItems.nth(2).locator('input[type="password"]').fill(data.password);
    if (data.email) {
      await formItems.nth(3).locator('input').fill(data.email);
    }
    if (data.role) {
      await formItems.nth(4).locator('.ant-select').click();
      await this.page.locator('.ant-select-dropdown .ant-select-item-option').filter({ hasText: data.role }).click();
    }
  }

  async submitCreate(): Promise<void> {
    await this.modal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async closeModal(): Promise<void> {
    const closeBtn = this.modal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async getUsernames(): Promise<string[]> {
    const count = await this.tableRows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push((await this.tableRows.nth(i).locator('td').first().textContent()) || '');
    }
    return names;
  }

  async clickEditButton(username: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: username });
    const editBtn = row.locator('button').filter({ hasText: '编辑' });
    await editBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickResetPasswordButton(username: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: username });
    const resetBtn = row.locator('button').filter({ hasText: '重置密码' });
    await resetBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillResetPassword(newPassword: string): Promise<void> {
    const formItems = this.modal.locator('.ant-form-item');
    await formItems.nth(0).locator('input[type="password"]').fill(newPassword);
    await formItems.nth(1).locator('input[type="password"]').fill(newPassword);
  }

  async submitResetPassword(): Promise<void> {
    await this.modal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async deleteUser(username: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: username });
    const deleteBtn = row.locator('button[ant-click-animating-without-extra-node]').filter({ hasText: '' }).first();
    // More reliable: find danger button in the row
    const dangerBtn = row.locator('button.ant-btn-dangerous').first();
    if (await dangerBtn.isVisible()) {
      await dangerBtn.click();
      await this.page.waitForTimeout(500);
      // Confirm
      const confirmBtn = this.page.locator('.ant-popover .ant-btn-primary');
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
        await this.page.waitForTimeout(1500);
      }
    }
  }

  async getStatusTag(username: string): Promise<string> {
    const row = this.tableRows.filter({ hasText: username });
    const tags = row.locator('.ant-tag');
    const count = await tags.count();
    if (count > 0) {
      return (await tags.last().textContent()) || '';
    }
    return '';
  }
}

// ============ System Roles Page ============

export class SystemRolesPage {
  readonly page: Page;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly createButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tableRows = page.locator('.ant-table-tbody tr');
    this.createButton = page.locator('button').filter({ hasText: '新增角色' });
    this.modal = page.locator('.ant-modal');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/platform/system/roles');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
  }

  async openCreateModal(): Promise<void> {
    await this.createButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillCreateForm(data: { code: string; name: string; description?: string }): Promise<void> {
    const formItems = this.modal.locator('.ant-form-item');
    await formItems.nth(0).locator('input').fill(data.code);
    await formItems.nth(1).locator('input').fill(data.name);
    if (data.description) {
      await formItems.nth(2).locator('textarea').fill(data.description);
    }
  }

  async submitCreate(): Promise<void> {
    await this.modal.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }

  async closeModal(): Promise<void> {
    const closeBtn = this.modal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  async clickEditButton(name: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: name });
    const editBtn = row.locator('button').filter({ hasText: '编辑' });
    await editBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickConfigurePermissionsButton(name: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: name });
    const permBtn = row.locator('button').filter({ hasText: '配置权限' });
    await permBtn.click();
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  async getRoleNames(): Promise<string[]> {
    const count = await this.tableRows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push((await this.tableRows.nth(i).locator('td').nth(1).textContent()) || '');
    }
    return names;
  }
}
