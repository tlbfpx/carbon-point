import { type Page, type Locator } from '@playwright/test';

export class PlatformConfigPage {
  readonly page: Page;
  readonly form: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('.ant-form');
    this.saveButton = page.locator('button').filter({ hasText: '保存' });
  }

  async goto() {
    await this.page.goto('/#/platform/config');
    await this.form.waitFor({ state: 'visible', timeout: 15000 });
  }

  async fillConfigField(label: string, value: string) {
    const field = this.form.locator('.ant-form-item').filter({ hasText: label }).locator('input');
    await field.fill(value);
  }

  async save() {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }
}