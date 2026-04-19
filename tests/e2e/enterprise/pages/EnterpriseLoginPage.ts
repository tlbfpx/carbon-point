import { Page, Locator } from '@playwright/test';

/**
 * Enterprise Admin Login Page Object
 * Maps to: saas-frontend/enterprise-frontend/src/pages/LoginPage.tsx
 */
export class EnterpriseLoginPage {
  private page: Page;

  // Form elements
  private phoneInput: Locator;
  private passwordInput: Locator;
  private rememberCheckbox: Locator;
  private loginButton: Locator;

  // Feedback elements
  private errorAlert: Locator;
  private formContainer: Locator;

  // Branding elements
  private brandTitle: Locator;
  private brandSubtitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Ant Design input selectors
    this.phoneInput = page.locator('input[placeholder="手机号"], input#phone').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.rememberCheckbox = page.locator('.login-checkbox, .ant-checkbox-wrapper').first();
    this.loginButton = page.locator('button[type="submit"]');

    // Error and feedback
    this.errorAlert = page.locator('div[style*="error"], .ant-result-subtitle, text=登录失败');
    this.formContainer = page.locator('.right-panel');

    // Branding
    this.brandTitle = page.locator('h1:has-text("碳积分")');
    this.brandSubtitle = page.locator('text=企业碳积分管理平台');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'networkidle' });
  }

  /**
   * Full login flow via UI
   */
  async login(phone: string, password: string): Promise<void> {
    await this.phoneInput.fill(phone);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      // If no redirect, page may show error - continue
    });
  }

  /**
   * Click login button without filling form (validation test)
   */
  async submitEmptyForm(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe(): Promise<void> {
    await this.rememberCheckbox.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    const errorText = await this.errorAlert.textContent().catch(() => '');
    if (errorText) return errorText;

    // Also check for antd form validation messages
    const antdError = await this.page.locator('.ant-form-item-explain-error').first().textContent().catch(() => '');
    return antdError;
  }

  /**
   * Check if login button is in loading state
   */
  async isLoginLoading(): Promise<boolean> {
    return this.loginButton.locator('.ant-btn-loading-icon').isVisible().catch(() => false);
  }

  /**
   * Check if error alert is visible
   */
  async isErrorVisible(): Promise<boolean> {
    return this.errorAlert.isVisible().catch(() => false);
  }

  /**
   * Check if login was successful (redirected to dashboard)
   */
  async isLoggedIn(): Promise<boolean> {
    return this.page.url().then((url) => url.includes('/dashboard'));
  }

  /**
   * Get the page title text
   */
  async getPageTitle(): Promise<string> {
    return this.brandTitle.textContent().catch(() => '');
  }

  /**
   * Check if brand elements are visible
   */
  async isBrandingVisible(): Promise<boolean> {
    return this.brandTitle.isVisible();
  }
}
