import { type Page, type Locator } from '@playwright/test';
import { BASE_URL } from '../config';

/**
 * Enterprise Admin Login Page Object
 * Enterprise URL: /login
 */
export class EnterpriseLoginPage {
  readonly page: Page;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberCheckbox: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.phoneInput = page.getByPlaceholder('请输入手机号');
    this.passwordInput = page.getByPlaceholder('请输入密码');
    this.rememberCheckbox = page.getByLabel('记住我');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/login`);
  }

  async login(phone: string, password: string) {
    await this.phoneInput.fill(phone);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');
  }
}
