import { type Page } from '@playwright/test';
import { BASE_URL } from '../config';

export class PointsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/points`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  // Points header
  get pointsHeader() {
    return this.page.locator('text=我的积分');
  }

  get totalPoints() {
    // The large number display showing total points
    return this.page.locator('p').filter({ hasText: /^\d[\d,]*$/ }).first();
  }

  get levelBadge() {
    return this.page.locator('text=Lv.').first();
  }

  // Level progress card
  get levelProgressCard() {
    return this.page.locator('.adm-card').filter({ hasText: '等级进度' });
  }

  get levelProgressBar() {
    return this.page.locator('.adm-progress-bar');
  }

  // Points history card
  get pointsHistoryCard() {
    return this.page.locator('.adm-card').filter({ hasText: '积分明细' });
  }

  get pointsHistoryList() {
    // The "积分明细" card contains the history list
    return this.page.locator('.adm-card').filter({ hasText: '积分明细' }).locator('.adm-card-body');
  }

  // Leaderboard card
  get leaderboardCard() {
    return this.page.locator('.adm-card').filter({ hasText: '排行榜' });
  }

  get myRankBadge() {
    return this.page.locator('text=我的排名');
  }

  get leaderboardList() {
    // The "排行榜" card contains the leaderboard list
    return this.page.locator('.adm-card').filter({ hasText: '排行榜' }).locator('.adm-card-body');
  }

  // Tab bar
  get tabBar() {
    return this.page.locator('.adm-tab-bar');
  }

  async navigateHome() {
    await this.page.locator('.adm-tab-bar-item').filter({ hasText: '首页' }).first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
