import { type Page, type Locator, type Expect } from '@playwright/test';
import { BASE_URL } from '../config';

export class PlatformLoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('请输入管理员用户名');
    this.passwordInput = page.getByPlaceholder('请输入密码');
    this.rememberCheckbox = page.getByLabel('记住用户名');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('.ant-alert');
  }

  async goto(): Promise<void> {
    await this.page.goto(BASE_URL + '/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  async expectLoginError(): Promise<void> {
    await Expect(this.errorAlert).toBeVisible();
  }

  async expectLoginErrorMessage(message: string): Promise<void> {
    await Expect(this.errorAlert.getByText(message)).toBeVisible();
  }

  async expectLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/\/platform\/dashboard/, { timeout: 10000 });
  }
}
