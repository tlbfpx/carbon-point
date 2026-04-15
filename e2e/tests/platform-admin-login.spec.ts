import { test, expect } from '@playwright/test';

test.describe('平台管理后台 - 从登录到所有菜单导航', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  test('平台管理员登录 - 成功进入', async ({ page }) => {
    // 导航到登录页
    await page.goto(`${baseUrl}/platform/login`);
    await page.waitForLoadState('networkidle');

    // 截图登录页
    await page.screenshot({ path: 'test-results/platform-login-page.png', fullPage: true });

    // 验证页面标题
    await expect(page).toHaveTitle(/平台管理登录/);

    // 输入用户名密码
    await page.getByLabel(/用户名/).fill(username);
    await page.getByLabel(/密码/).fill(password);

    // 点击登录按钮
    const loginButton = page.getByRole('button', { name: /登录/ });
    await expect(loginButton).toBeEnabled();
    await loginButton.click();

    // 等待跳转完成
    await page.waitForLoadState('networkidle');
    await page.waitForURL(`${baseUrl}/platform/dashboard`);

    // 验证登录成功 - 应该显示数据看板
    await expect(page.getByText(/全平台数据概览/)).toBeVisible();

    // 截图登录后首页
    await page.screenshot({ path: 'test-results/platform-dashboard.png', fullPage: true });

    console.log('✓ 登录成功，进入数据看板');
  });

  test('导航所有菜单项 - 验证都能正常打开', async ({ page }) => {
    // 先登录
    await page.goto(`${baseUrl}/platform/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/用户名/).fill(username);
    await page.getByLabel(/密码/).fill(password);
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForURL(`${baseUrl}/platform/dashboard`);
    await page.waitForLoadState('networkidle');

    // 定义所有菜单
    const menus = [
      { name: '数据看板', expectedText: '全平台数据概览' },
      { name: '企业管理', expectedText: '企业列表' },
      { name: '套餐管理', expectedText: '权限套餐' },
      { name: '管理员', expectedText: '平台管理员' },
      { name: '系统配置', expectedText: '平台配置' },
      { name: '操作日志', expectedText: '操作日志' },
    ];

    // 逐个点击菜单并验证
    for (const menu of menus) {
      console.log(`  导航到: ${menu.name}`);

      // 点击菜单
      await page.getByRole('link', { name: menu.name }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // 等待渲染

      // 验证页面内容
      await expect(page.getByText(new RegExp(menu.expectedText))).toBeVisible();

      // 截图每个页面
      const fileName = menu.name.replace(/\s/g, '-').toLowerCase();
      await page.screenshot({
        path: `test-results/platform-${fileName}.png`,
        fullPage: true
      });

      // 验证URL包含对应路径
      await expect(page).toHaveURL(new RegExp(fileName));

      console.log(`  ✓ ${menu.name} 验证通过`);
    }

    console.log('✓ 所有菜单导航验证完成');

    // 检查侧边栏菜单折叠展开
    console.log('  测试菜单折叠');
    // 如果有折叠菜单，点击测试
    const firstMenu = page.getByRole('link', { name: '企业管理' });
    await firstMenu.click();
    await page.waitForTimeout(300);

    // 最终截图完整侧边栏
    await page.screenshot({
      path: 'test-results/platform-sidebar-all.png',
      fullPage: true
    });
  });

  test('错误用户名密码 - 提示错误', async ({ page }) => {
    await page.goto(`${baseUrl}/platform/login`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/用户名/).fill('wronguser');
    await page.getByLabel(/密码/).fill('wrongpass');
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForLoadState('networkidle');

    // 验证错误提示
    await expect(page.getByText(/用户名或密码错误/)).toBeVisible();
    console.log('✓ 错误用户名密码提示正确');

    // 截图错误状态
    await page.screenshot({ path: 'test-results/platform-login-error.png', fullPage: true });
  });

  test('空用户名 - 前端校验提示', async ({ page }) => {
    await page.goto(`${baseUrl}/platform/login`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/密码/).fill('somepassword');
    const loginButton = page.getByRole('button', { name: /登录/ });

    // 按钮应该被禁用
    await expect(loginButton).toBeDisabled();
    console.log('✓ 空用户名前端校验正确');
  });

  test('退出登录 - 返回登录页', async ({ page }) => {
    // 登录
    await page.goto(`${baseUrl}/platform/login`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/用户名/).fill(username);
    await page.getByLabel(/密码/).fill(password);
    await page.getByRole('button', { name: /登录/ }).click();
    await page.waitForURL(`${baseUrl}/platform/dashboard`);
    await page.waitForLoadState('networkidle');

    // 点击退出登录（通常在右上角用户信息下拉）
    await page.getByText(/admin/).click();
    await page.waitForTimeout(300);
    await page.getByText(/退出登录/).click();
    await page.waitForLoadState('networkidle');

    // 验证返回登录页
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible();
    console.log('✓ 退出登录成功');

    await page.screenshot({ path: 'test-results/platform-logout.png', fullPage: true });
  });

  test('未登录直接访问 dashboard - 重定向登录', async ({ page }) => {
    await page.goto(`${baseUrl}/platform/dashboard`);
    await page.waitForLoadState('networkidle');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel(/用户名/)).toBeVisible();
    console.log('✓ 未登录访问保护正确');
  });
});
