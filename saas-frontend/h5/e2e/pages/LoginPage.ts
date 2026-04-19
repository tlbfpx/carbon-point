import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/login`);
    await this.page.waitForLoadState('networkidle');
  }

  get phoneInput() {
    return this.page.locator('input[placeholder="请输入手机号"]');
  }

  get passwordInput() {
    return this.page.locator('input[placeholder="请输入密码"]');
  }

  get loginButton() {
    return this.page.locator('button').filter({ hasText: '登录' }).first();
  }

  get rememberCheckbox() {
    return this.page.locator('.adm-checkbox');
  }

  get registerLink() {
    return this.page.locator('span').filter({ hasText: '立即注册' });
  }

  get forgotPasswordLink() {
    return this.page.locator('span').filter({ hasText: '忘记密码' });
  }

  async login(phone: string, password: string) {
    await this.phoneInput.fill(phone);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}
