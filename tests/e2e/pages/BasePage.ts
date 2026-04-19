import { Page, Locator, expect } from '@playwright/test';

/**
 * Base class for all Page Objects.
 * Provides common navigation and interaction methods.
 */
export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = '';
  }

  async goto(path: string = ''): Promise<void> {
    const url = `${this.baseURL}${path}`;
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  async getByRole(role: 'button' | 'link' | 'textbox' | 'heading' | 'img' | 'checkbox' | 'radio', options?: any): Promise<Locator> {
    return this.page.getByRole(role, options);
  }

  async getByText(text: string, options?: any): Promise<Locator> {
    return this.page.getByText(text, options);
  }

  async getByLabel(label: string, options?: any): Promise<Locator> {
    return this.page.getByLabel(label, options);
  }

  async getByPlaceholder(placeholder: string, options?: any): Promise<Locator> {
    return this.page.getByPlaceholder(placeholder, options);
  }

  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string> {
    return this.page.textContent(selector) || '';
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page.isVisible(selector);
  }

  async waitForSelector(selector: string, options?: any): Promise<void> {
    await this.page.waitForSelector(selector, options);
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `reports/screenshots/${name}.png`, fullPage: true });
  }

  protected async assertText(text: string, message?: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ message });
  }

  protected async assertNoText(text: string): Promise<void> {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }

  protected async assertURLContains(text: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(text));
  }

  // Convenience locator for antd-mobile components
  protected admCard(title?: string): Locator {
    if (title) {
      return this.page.locator('.adm-card').filter({ hasText: title });
    }
    return this.page.locator('.adm-card');
  }

  protected admTabBar() {
    return this.page.locator('.adm-tab-bar');
  }

  protected admListItem(content?: string): Locator {
    if (content) {
      return this.page.locator('.adm-list-item').filter({ hasText: content });
    }
    return this.page.locator('.adm-list-item');
  }

  protected admBadge(content?: string): Locator {
    if (content) {
      return this.page.locator('.adm-badge').filter({ hasText: content });
    }
    return this.page.locator('.adm-badge');
  }
}
