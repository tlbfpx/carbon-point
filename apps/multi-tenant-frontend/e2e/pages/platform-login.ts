import { type Page, type Locator, expect } from '@playwright/test';
import { BASE_URL } from '../config';

/**
 * Platform Admin Login Page Object
 * Platform URL: /
 */
export class PlatformLoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberCheckbox: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder('请输入管理员用户名');
    this.passwordInput = page.getByPlaceholder('请输入密码');
    this.rememberCheckbox = page.getByLabel('记住我');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/`);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoginError(message?: string) {
    // Ant Design message.error appears as an ant-message div
    await expect(this.page.locator('.ant-message')).toBeVisible();
    if (message) {
      await expect(this.page.locator('.ant-message').getByText(message)).toBeVisible();
    }
  }
}
