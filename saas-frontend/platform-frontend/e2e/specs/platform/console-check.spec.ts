/**
 * Console 检查测试 - 遍历所有页面检查 Console Error/Warning
 *
 * 目标：Zero Error, Zero Warning（白名单除外）
 */

import { test, expect } from '@playwright/test';
import { consoleMonitor, ConsoleMonitor } from '../../utils/console-monitor';

test.describe('Console 零错误检查 - 平台管理后台', () => {
  let monitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new ConsoleMonitor();
    monitor.start(page);
  });

  test.afterEach(() => {
    monitor.printReport();
    // 检查是否有错误（Warning 先记录但不阻断，后续逐步清理）
    monitor.assertNoErrors();
  });

  test('1. 登录页面 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('2. 仪表盘 - 检查 Console', async ({ page }) => {
    // 先登录
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('3. 企业管理 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.getByText('企业管理', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('4. 系统管理 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.getByText('系统管理', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('5. 产品管理 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.getByText('产品管理', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('6. 套餐管理 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.getByText('套餐管理', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('7. 平台配置 - 检查 Console', async ({ page }) => {
    await page.goto('/platform/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('/platform');
    await page.getByText('平台配置', { exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });
});
