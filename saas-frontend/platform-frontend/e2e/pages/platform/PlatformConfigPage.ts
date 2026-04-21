import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../../config';

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
    await this.page.goto(`${BASE_URL}/config`);
    await this.form.waitFor({ state: 'visible', timeout: 15000 });
  }

  async fillConfigField(label: string, value: string) {
    const field = this.form.locator('.ant-form-item').filter({ hasText: label }).locator('input');
    await field.fill(value);
  }

  async save() {
    await this.saveButton.click();
    // Wait for save operation to complete - either success message or error
    await this.page.locator('.ant-message').waitFor({ state: 'visible', timeout: 5000 });
  }
}