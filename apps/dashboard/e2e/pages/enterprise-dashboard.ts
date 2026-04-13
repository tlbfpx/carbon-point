import { type Page, type Locator } from '@playwright/test';

/**
 * Enterprise Sidebar Navigation Page Object
 * Shared across enterprise pages for menu visibility tests.
 */
export class EnterpriseSidebar {
  readonly page: Page;
  readonly menuItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuItems = page.locator('.ant-menu li');
  }

  async goto() {
    await this.page.goto('/dashboard/enterprise/dashboard');
  }

  async expectMenuItemVisible(label: string, visible: boolean = true) {
    const item = this.page.locator('.ant-menu li').filter({ hasText: label });
    if (visible) {
      await item.waitFor({ state: 'visible' });
    } else {
      await item.waitFor({ state: 'hidden' });
    }
  }

  getMenuItem(label: string): Locator {
    return this.page.locator('.ant-menu li').filter({ hasText: label });
  }

  async getVisibleMenuLabels(): Promise<string[]> {
    const items = this.page.locator('.ant-menu li');
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) labels.push(text.trim());
    }
    return labels;
  }
}
