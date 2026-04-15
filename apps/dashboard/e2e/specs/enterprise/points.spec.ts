import { test, expect } from '@playwright/test';
import { PointsPage } from '../../pages/enterprise/PointsPage';

test.describe('企业后台 - 积分运营', () => {
  let pointsPage: PointsPage;

  test.beforeEach(async ({ page }) => {
    pointsPage = new PointsPage(page);
    await pointsPage.goto();
  });

  test('PNT-001: 积分流水展示', async () => {
    await expect(pointsPage.table).toBeVisible();
  });

  test('PNT-002: 积分统计卡片显示', async () => {
    const totalPoints = await pointsPage.getTotalPoints();
    expect(parseInt(totalPoints)).toBeGreaterThanOrEqual(0);
  });
});
