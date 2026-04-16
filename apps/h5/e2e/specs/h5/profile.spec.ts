import { test, expect } from '@playwright/test';
import { BASE_URL } from '../../config';
import { loginAndNavigate } from '../../helpers';
import { ProfilePage } from '../../pages/ProfilePage';
import { HomePage } from '../../pages/HomePage';

test.describe('H5 - 个人中心页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('carbon-auth'));
    await loginAndNavigate(page, '/profile');
  });

  test('H5-PROFILE-001: 个人中心正确渲染', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.tabBar).toBeVisible({ timeout: 10000 });
  });

  test('H5-PROFILE-002: 用户头部信息可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.userHeader).toBeVisible();
  });

  test('H5-PROFILE-003: 用户ID显示', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.userId).toBeVisible();
  });

  test('H5-PROFILE-004: 我的积分卡片可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.pointsCard).toBeVisible();
  });

  test('H5-PROFILE-005: 个人信息卡片可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.personalInfoCard).toBeVisible();
  });

  test('H5-PROFILE-006: 用户名行可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.usernameRow).toBeVisible();
  });

  test('H5-PROFILE-007: 手机号行可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.phoneRow).toBeVisible();
  });

  test('H5-PROFILE-008: 设置卡片可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.settingsCard).toBeVisible();
  });

  test('H5-PROFILE-009: 消息通知开关可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.notificationsSwitch).toBeVisible();
  });

  test('H5-PROFILE-010: 声音提示开关可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.soundSwitch).toBeVisible();
  });

  test('H5-PROFILE-011: 退出登录按钮可见', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await expect(profilePage.logoutButton).toBeVisible();
  });

  test('H5-PROFILE-012: TabBar点击首页返回首页', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.homeTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const homePage = new HomePage(page);
    await expect(homePage.tabBar).toBeVisible({ timeout: 5000 });
  });

  test('H5-PROFILE-013: 点击退出登录跳转到登录页', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.clickLogout();
    await page.waitForTimeout(3000);
    // Should redirect to login page
    const isOnLogin = await profilePage.isLoggedOut();
    expect(isOnLogin).toBe(true);
  });

  test('H5-PROFILE-014: 登出后访问受保护页面重定向到登录', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.clickLogout();
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:80/h5/');
    await page.waitForLoadState('networkidle');
    // Should redirect to login
    const isOnLogin = await page.url().includes('/login');
    expect(isOnLogin).toBe(true);
  });

  test('H5-PROFILE-015: 无JS崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
