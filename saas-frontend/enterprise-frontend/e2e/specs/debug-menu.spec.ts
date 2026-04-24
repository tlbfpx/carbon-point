import { test, expect, chromium } from '@playwright/test';
import { loginAsEnterpriseAdmin } from '../helpers';
import { BASE_URL } from '../config';

test.describe('企业后台 - 菜单调试测试', () => {
  test('DEBUG-001: 打开规则配置页面验证', async ({ page }) => {
    test.slow();

    await loginAsEnterpriseAdmin(page, BASE_URL);

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 截图：初始页面
    await page.screenshot({ path: 'e2e/reports/debug-01-initial.png', fullPage: true });

    // 打印当前URL
    console.log('[DEBUG] Current URL:', page.url());

    // 查找菜单
    console.log('[DEBUG] Finding menu items...');

    // 尝试查找"规则配置"菜单项
    const ruleMenu = page.getByText('规则配置').first();
    const hasRuleMenu = await ruleMenu.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[DEBUG] Has visible "规则配置" menu:', hasRuleMenu);

    // 尝试查找"爬楼积分管理"
    const stairGroup = page.getByText('爬楼积分管理').first();
    const hasStairGroup = await stairGroup.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[DEBUG] Has visible "爬楼积分管理" group:', hasStairGroup);

    // 截图：菜单查找后
    await page.screenshot({ path: 'e2e/reports/debug-02-menus.png', fullPage: true });

    // 如果有爬楼积分管理分组，先展开
    if (hasStairGroup) {
      console.log('[DEBUG] Clicking 爬楼积分管理...');
      await stairGroup.click();
      await page.waitForTimeout(1000);
    }

    // 再次尝试查找规则配置
    const ruleMenuAfterExpand = page.getByText('规则配置').first();
    const hasRuleMenuAfter = await ruleMenuAfterExpand.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[DEBUG] Has visible "规则配置" after expand:', hasRuleMenuAfter);

    // 截图：展开后
    await page.screenshot({ path: 'e2e/reports/debug-03-expanded.png', fullPage: true });

    if (hasRuleMenuAfter) {
      console.log('[DEBUG] Clicking 规则配置...');
      await ruleMenuAfterExpand.click();

      // 等待导航
      await page.waitForTimeout(3000);

      // 截图：点击后
      await page.screenshot({ path: 'e2e/reports/debug-04-after-click.png', fullPage: true });

      console.log('[DEBUG] URL after click:', page.url());

      // 检查页面标题
      const pageTitle = await page.locator('h1').first().textContent().catch(() => '');
      console.log('[DEBUG] Page title:', pageTitle);

      // 检查是否显示规则配置
      const hasRulesTitle = await page.getByText('规则配置').isVisible({ timeout: 5000 }).catch(() => false);
      console.log('[DEBUG] Has "规则配置" title:', hasRulesTitle);

      // 检查是否还在dashboard
      const hasDashboardText = await page.getByText('今日签到').isVisible({ timeout: 2000 }).catch(() => false);
      console.log('[DEBUG] Still on dashboard (has "今日签到"):', hasDashboardText);
    }

    // 列出所有菜单项
    console.log('[DEBUG] All menu item texts:');
    const menuItems = page.locator('.ant-menu-item, .ant-menu-submenu-title');
    const count = await menuItems.count();
    for (let i = 0; i < count; i++) {
      const text = await menuItems.nth(i).textContent().catch(() => '');
      const isSelected = await menuItems.nth(i).getAttribute('class').then(c => c?.includes('selected')).catch(() => false);
      console.log(`  [${i}] ${text}${isSelected ? ' [SELECTED]' : ''}`);
    }
  });
});
