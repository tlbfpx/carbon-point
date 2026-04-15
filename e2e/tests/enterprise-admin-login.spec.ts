import { test, expect } from '@playwright/test';

test.describe('企业管理后台 - 从登录到所有菜单导航', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
  const username = process.env.ENTERPRISE_USERNAME || 'admin';
  const password = process.env.ENTERPRISE_PASSWORD || 'admin123';

  test('企业管理员登录 - 成功进入', async ({ page }) => {
    await page.goto(`${baseUrl}/enterprise/login`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/enterprise-login-page.png', fullPage: true });
    await expect(page).toHaveTitle(/企业管理登录/);

    await page.getByLabel(/手机号/).fill(username);
    await page.getByLabel(/密码/).fill(password);

    const loginButton = page.getByRole('button', { name: /登录/ });
    await expect(loginButton).toBeEnabled();
    await loginButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForURL(`${baseUrl}/enterprise/dashboard`);

    await expect(page.getByText(/企业数据概览/)).toBeVisible();
    await page.screenshot({ path: 'test-results/enterprise-dashboard.png', fullPage: true });

    console.log('✓ 企业管理员登录成功');
  });

  test('导航所有菜单项 - 验证都能正常打开', async ({ page }) => {
    // 登录
    await page.goto(`${baseUrl}/enterprise/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/手机号/).fill(username);
    await page.getByLabel(/密码/).fill(password);
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForURL(`${baseUrl}/enterprise/dashboard`);
    await page.waitForLoadState('networkidle');

    // 定义所有一级菜单
    const menus = [
      { group: '首页', items: [
        { name: '数据看板', expectedText: '企业数据概览' }
      ]},
      { group: '员工管理', items: [
        { name: '员工列表', expectedText: '员工管理' },
        { name: '部门管理', expectedText: '部门管理' }
      ]},
      { group: '权限管理', items: [
        { name: '角色管理', expectedText: '角色管理' }
      ]},
      { group: '积分规则', items: [
        { name: '规则配置', expectedText: '积分规则配置' }
      ]},
      { group: '积分运营', items: [
        { name: '积分流水', expectedText: '积分流水' }
      ]},
      { group: '商品管理', items: [
        { name: '虚拟商品', expectedText: '商品管理' },
        { name: '兑换订单', expectedText: '订单管理' }
      ]},
      { group: '数据报表', items: [
        { name: '数据统计', expectedText: '数据报表' }
      ]},
      { group: '系统设置', items: [
        { name: '企业信息', expectedText: '企业信息' }
      ]}
    ];

    for (const group of menus) {
      for (const item of group.items) {
        console.log(`  导航到: ${group.group} → ${item.name}`);

        // 点击菜单项
        await page.getByRole('link', { name: item.name }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // 验证页面内容
        await expect(page.getByText(new RegExp(item.expectedText))).toBeVisible();

        // 截图
        const fileName = `${item.name.replace(/\s/g, '-').toLowerCase()}`;
        await page.screenshot({
          path: `test-results/enterprise-${fileName}.png`,
          fullPage: true
        });

        console.log(`  ✓ ${item.name} 验证通过`);
      }
    }

    console.log('✓ 所有菜单导航验证完成');

    // 截图完整侧边栏
    await page.screenshot({
      path: 'test-results/enterprise-sidebar-all.png',
      fullPage: true
    });
  });

  test('错误密码 - 提示错误', async ({ page }) => {
    await page.goto(`${baseUrl}/enterprise/login`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/手机号/).fill('13800000000');
    await page.getByLabel(/密码/).fill('wrong');
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/用户名或密码错误/)).toBeVisible();
    await page.screenshot({ path: 'test-results/enterprise-login-error.png', fullPage: true });
    console.log('✓ 错误密码提示正确');
  });

  test('空手机号 - 按钮禁用', async ({ page }) => {
    await page.goto(`${baseUrl}/enterprise/login`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/密码/).fill('password');
    const loginButton = page.getByRole('button', { name: /登录/ });
    await expect(loginButton).toBeDisabled();
    console.log('✓ 前端校验正确');
  });

  test('退出登录', async ({ page }) => {
    await page.goto(`${baseUrl}/enterprise/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/手机号/).fill(username);
    await page.getByLabel(/密码/).fill(password);
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForURL(`${baseUrl}/enterprise/dashboard`);
    await page.waitForLoadState('networkidle');

    await page.getByText(/admin/).click();
    await page.waitForTimeout(300);
    await page.getByText(/退出登录/).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible();
    console.log('✓ 退出登录成功');
  });

  test('未登录访问 - 重定向登录', async ({ page }) => {
    await page.goto(`${baseUrl}/enterprise/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel(/手机号/)).toBeVisible();
    console.log('✓ 未登录访问保护正确');
  });
});
