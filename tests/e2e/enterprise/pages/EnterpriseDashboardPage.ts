import { Page, Locator } from '@playwright/test';

/**
 * Enterprise Admin Dashboard Page Object
 * Maps to: saas-frontend/enterprise-frontend/src/pages/Dashboard.tsx
 */
export class EnterpriseDashboardPage {
  private page: Page;

  // Header
  private pageTitle: Locator;
  private pageSubtitle: Locator;
  private exportButton: Locator;

  // Stats cards (BentoGrid with 4 GlassCardStat components)
  private statCards: Locator;
  private todayCheckInCard: Locator;
  private todayPointsCard: Locator;
  private activeUsersCard: Locator;
  private monthExchangeCard: Locator;

  // Insight banner
  private insightBanner: Locator;

  // Charts
  private checkInTrendChart: Locator;
  private pointsTrendChart: Locator;
  private hotProductsTable: Locator;

  // Natural language query
  private naturalLanguageQuery: Locator;
  private queryInput: Locator;
  private quickQueryButtons: Locator;

  // Navigation sidebar
  private sidebar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header
    this.pageTitle = page.locator('h1:has-text("数据概览"), h1:has-text("Dashboard")').first();
    this.pageSubtitle = page.locator('text=实时运营数据监控').first();
    this.exportButton = page.locator('button:has-text("导出报告")');

    // Stats - BentoGrid with 4 cards
    this.statCards = page.locator('[class*="GlassCardStat"], [class*="bento"] > *');
    this.todayCheckInCard = page.locator('text=今日签到').first();
    this.todayPointsCard = page.locator('text=今日积分').first();
    this.activeUsersCard = page.locator('text=活跃成员').first();
    this.monthExchangeCard = page.locator('text=本月兑换').first();

    // Insight banner
    this.insightBanner = page.locator('[class*="InsightBanner"], [class*="insight"]').first();

    // Charts
    this.checkInTrendChart = page.locator('text=签到趋势').first();
    this.pointsTrendChart = page.locator('text=积分概况').first();
    this.hotProductsTable = page.locator('text=热门商品').first();

    // Natural language query
    this.naturalLanguageQuery = page.locator('[class*="NaturalLanguageQuery"]').first();
    this.queryInput = page.locator('input[placeholder*="问"], input[placeholder*="查询"], [class*="NaturalLanguageQuery"] input').first();
    this.quickQueryButtons = page.locator('[class*="NaturalLanguageQuery"] button, button:has-text("今日签到数据"), button:has-text("本周新增用户"), button:has-text("热门商品排行")');

    // Sidebar navigation
    this.sidebar = page.locator('[class*="sidebar"], [class*="Sider"], nav, [class*="menu"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard', { waitUntil: 'networkidle' });
  }

  /**
   * Wait for dashboard to fully load (stats + charts)
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('[class*="GlassCardStat"], [class*="bento"]', { timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if page title is visible
   */
  async isPageTitleVisible(): Promise<boolean> {
    return this.pageTitle.isVisible().catch(() => false);
  }

  /**
   * Get stat card values
   */
  async getStatValue(label: 'checkin' | 'points' | 'users' | 'exchange'): Promise<string> {
    const cardMap = {
      checkin: this.todayCheckInCard,
      points: this.todayPointsCard,
      users: this.activeUsersCard,
      exchange: this.monthExchangeCard,
    };
    const card = cardMap[label];

    // Navigate to parent to find value
    const valueLocator = card.locator('..').locator('[class*="value"], [class*="stat-value"]').first();
    return valueLocator.textContent().catch(async () => {
      // Fallback: get the card's ancestor and look for large number
      const parent = await card.locator('..').locator('..').first();
      const text = await parent.textContent();
      // Extract number from text
      const match = text?.match(/[\d,]+/);
      return match ? match[0] : '';
    });
  }

  /**
   * Check if charts are rendered
   */
  async areChartsRendered(): Promise<boolean> {
    const chartVisible = await this.checkInTrendChart.isVisible().catch(() => false);
    return chartVisible;
  }

  /**
   * Check if hot products table is visible
   */
  async isHotProductsVisible(): Promise<boolean> {
    return this.hotProductsTable.isVisible().catch(() => false);
  }

  /**
   * Check if insight banner is visible
   */
  async isInsightBannerVisible(): Promise<boolean> {
    return this.insightBanner.isVisible().catch(() => false);
  }

  /**
   * Click export report button
   */
  async clickExportReport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * Click a quick query button
   */
  async clickQuickQuery(query: '今日签到数据' | '本周新增用户' | '热门商品排行'): Promise<void> {
    await this.page.locator(`button:has-text("${query}")`).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Type a natural language query
   */
  async queryNaturalLanguage(query: string): Promise<void> {
    if (await this.queryInput.isVisible().catch(() => false)) {
      await this.queryInput.fill(query);
      await this.queryInput.press('Enter');
    }
  }

  /**
   * Navigate via sidebar to a page
   */
  async navigateTo(menuItem: string): Promise<void> {
    await this.page.locator(`text="${menuItem}"`).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get page URL
   */
  async getUrl(): Promise<string> {
    return this.page.url();
  }
}
