import { Page } from '@playwright/test';
import { BASE_URL } from './config';
import { BasePage } from '../pages/BasePage';

/**
 * H5 User Login Page
 * Maps to: saas-frontend/h5/src/pages/LoginPage.tsx
 */
export class H5LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
    this.baseURL = BASE_URL;
  }

  override async goto(path: string = '/login'): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`, { waitUntil: 'networkidle' });
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

  get titleText() {
    return this.page.locator('h1').filter({ hasText: '碳积分打卡平台' });
  }

  get subtitleText() {
    return this.page.locator('p').filter({ hasText: '健康运动，积分激励' });
  }

  get noAccountText() {
    return this.page.locator('text=还没有账号？');
  }

  async login(phone: string, password: string) {
    await this.phoneInput.fill(phone);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToRegister() {
    await this.registerLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }
}
