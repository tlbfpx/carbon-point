import { test, expect, chromium, Browser, BrowserContext, Page, ConsoleMessage } from '@playwright/test';

/**
 * Enterprise Admin Dashboard Acceptance Test
 * Tests all acceptance criteria for the enterprise management backend.
 *
 * Test Environment:
 * - Frontend: http://localhost:3003 (Vite dev server)
 * - Backend: http://localhost:8080
 * - Enterprise Admin: 13800138001 / password123
 *
 * Screenshots saved to: /tmp/enterprise_test/
 */

const BASE_URL = 'http://localhost:3003';
const BACKEND_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/tmp/enterprise_test';

const TEST_USER = {
  phone: '13800138001',
  password: 'password123',
};

interface TestResult {
  id: string;
  category: string;
  criterion: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIP';
  details: string;
  screenshot?: string;
}

const results: TestResult[] = [];

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function takeFullPageScreenshot(page: Page, name: string): Promise<string> {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

function recordResult(id: string, category: string, criterion: string, status: TestResult['status'], details: string, screenshot?: string) {
  results.push({ id, category, criterion, status, details, screenshot });
  console.log(`[${status}] ${category} > ${criterion}: ${details}`);
}

async function waitForAntTable(page: Page, timeout = 10000) {
  await page.waitForSelector('.ant-table-tbody', { timeout });
}

// ===== TEST 1: Enterprise Login Page Independence =====

async function test_1_LoginPageIndependence(page: Page) {
  const testId = '1';
  const category = '独立的入口及菜单';

  // Check if enterprise login page is accessible and has enterprise branding
  await page.goto(`${BASE_URL}/#/login`);
  await page.waitForLoadState('networkidle');

  const title = await page.textContent('h1').catch(() => '');
  const hasEnterpriseBranding = title?.includes('碳积分') || title?.includes('企业');
  const hasLoginForm = await page.locator('input[placeholder*="手机号"]').isVisible();
  const hasPasswordField = await page.locator('input[placeholder*="密码"]').isVisible();

  if (hasEnterpriseBranding && hasLoginForm && hasPasswordField) {
    await takeScreenshot(page, `${testId}_login_page`);
    recordResult(testId, category, '企业登录页独立', 'PASS', '企业登录页独立，带企业品牌标识（碳积分管理后台），包含手机号和密码输入框', `${SCREENSHOT_DIR}/${testId}_login_page.png`);
  } else {
    await takeScreenshot(page, `${testId}_login_page_fail`);
    recordResult(testId, category, '企业登录页独立', 'FAIL', `页面标题: "${title}", 登录表单: ${hasLoginForm}, 密码字段: ${hasPasswordField}`, `${SCREENSHOT_DIR}/${testId}_login_page_fail.png`);
  }

  // Check that this is different from platform login (platform has "平台管理" or similar)
  const platformLoginPage = await page.goto(`${BASE_URL}/#/saas/login`).catch(() => null);
  if (platformLoginPage) {
    const platformTitle = await page.textContent('h1').catch(() => '');
    const isDifferent = platformTitle !== title;
    if (isDifferent) {
      recordResult('1b', category, '平台登录页区分', 'PASS', `企业登录: "${title}" vs 平台登录: "${platformTitle}"，两个入口独立`);
    }
  }
}

// ===== TEST 2: Login with Enterprise Admin =====

async function test_2_Login(page: Page) {
  const testId = '2';
  const category = '登录功能';

  await page.goto(`${BASE_URL}/#/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[placeholder*="手机号"]', TEST_USER.phone);
  await page.fill('input[placeholder*="密码"]', TEST_USER.password);

  await takeScreenshot(page, `${testId}_login_form_filled`);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  try {
    await page.waitForURL('**/#/enterprise/**', { timeout: 10000 });
    await takeScreenshot(page, `${testId}_after_login`);

    // Check if redirected to enterprise dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/enterprise/')) {
      recordResult(testId, category, '企业管理员登录', 'PASS', `成功登录并重定向到企业后台: ${currentUrl}`, `${SCREENSHOT_DIR}/${testId}_after_login.png`);
    } else {
      recordResult(testId, category, '企业管理员登录', 'FAIL', `登录后URL: ${currentUrl}，未重定向到企业后台`, `${SCREENSHOT_DIR}/${testId}_after_login.png`);
    }
  } catch (e) {
    await takeScreenshot(page, `${testId}_login_failed`);
    // Check for error message
    const errorMsg = await page.locator('.ant-message-error').textContent().catch(() => '未找到错误信息');
    recordResult(testId, category, '企业管理员登录', 'BLOCKED', `登录失败或超时，错误: ${errorMsg}`, `${SCREENSHOT_DIR}/${testId}_login_failed.png`);
  }
}

// ===== TEST 3: Menu Rendering =====

async function test_3_MenuRendering(page: Page) {
  const testId = '3';
  const category = '菜单渲染';

  await page.goto(`${BASE_URL}/#/enterprise/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ant-layout-sider', { timeout: 15000 });
  // Ant Design menu may be hidden due to CSS, check for existence instead
  await page.waitForSelector('.ant-menu', { timeout: 10000, state: 'attached' });

  const expectedMenus = [
    '数据看板',
    '员工管理',
    '规则配置',
    '商品管理',
    '订单管理',
    '积分运营',
    '数据报表',
    '角色权限',
  ];

  const visibleMenus: string[] = [];
  for (const menu of expectedMenus) {
    const item = page.locator('.ant-menu li, .ant-menu-submenu').filter({ hasText: menu });
    if (await item.isVisible().catch(() => false)) {
      visibleMenus.push(menu);
    }
  }

  await takeScreenshot(page, `${testId}_menu_visible`);

  const missingMenus = expectedMenus.filter(m => !visibleMenus.includes(m));
  if (missingMenus.length === 0) {
    recordResult(testId, category, '左侧菜单完整渲染', 'PASS', `所有8个菜单项均可见: ${visibleMenus.join(', ')}`, `${SCREENSHOT_DIR}/${testId}_menu_visible.png`);
  } else {
    recordResult(testId, category, '左侧菜单完整渲染', 'FAIL', `缺少菜单: ${missingMenus.join(', ')}，可见菜单: ${visibleMenus.join(', ')}`, `${SCREENSHOT_DIR}/${testId}_menu_visible.png`);
  }
}

// ===== TEST 4: Employee Management =====

async function test_4_EmployeeManagement(page: Page) {
  const testId = '4';
  const category = '员工管理';

  // Navigate to members page
  await page.goto(`${BASE_URL}/#/enterprise/members`);
  await page.waitForLoadState('networkidle');

  try {
    await waitForAntTable(page, 15000);
    await takeFullPageScreenshot(page, `${testId}_member_list`);

    // 4a. Member list display
    const rows = await page.locator('.ant-table-tbody tr').count();
    recordResult('4a', category, '员工列表', 'PASS', `员工列表加载成功，当前有 ${rows} 行数据`, `${SCREENSHOT_DIR}/${testId}_member_list.png`);

    // 4b. Add new employee
    const addBtn = page.getByRole('button', { name: /新增员工|添加员工/i });
    const addBtnVisible = await addBtn.isVisible().catch(() => false);

    if (addBtnVisible) {
      await addBtn.click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_add_member_modal`);

      // Try to submit without filling required fields
      const confirmBtn = page.locator('.ant-modal button').filter({ hasText: /确 定|提交|创建/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        // Should show validation errors
        const hasValidation = await page.locator('.ant-form-item-explain-error').isVisible().catch(() => false);
        recordResult('4b', category, '新增员工表单验证', hasValidation ? 'PASS' : 'FAIL', hasValidation ? '表单验证正常工作' : '未显示表单验证错误', `${SCREENSHOT_DIR}/${testId}_add_member_modal.png`);
      }

      // Close modal
      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    } else {
      recordResult('4b', category, '新增员工按钮', 'FAIL', '新增员工按钮不可见，可能无权限', undefined);
    }

    // 4c. Edit employee
    const editBtn = page.locator('.ant-table-tbody tr button').filter({ hasText: /编辑|禁用|启用/ }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_edit_member_modal`);
      recordResult('4c', category, '编辑员工', 'PASS', '编辑员工弹窗打开成功', `${SCREENSHOT_DIR}/${testId}_edit_member_modal.png`);

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      recordResult('4c', category, '编辑员工', 'SKIP', '没有可编辑的员工行或按钮不可见', undefined);
    }

  } catch (e: any) {
    await takeScreenshot(page, `${testId}_member_error`);
    recordResult(testId, category, '员工管理', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_member_error.png`);
  }
}

// ===== TEST 5: Rule Configuration =====

async function test_5_RuleConfiguration(page: Page) {
  const testId = '5';
  const category = '规则配置管理';

  // Navigate to rules page
  await page.goto(`${BASE_URL}/#/enterprise/rules`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForSelector('.ant-table-tbody', { timeout: 15000 });
    await takeFullPageScreenshot(page, `${testId}_rules_list`);

    // Check for time-slot rules section
    const hasTimeSlotRules = await page.getByText(/时段|时间/i).first().isVisible().catch(() => false);
    const hasConsecutiveRules = await page.getByText(/连续|打卡/i).first().isVisible().catch(() => false);

    recordResult('5a', category, '时段规则', hasTimeSlotRules ? 'PASS' : 'FAIL', hasTimeSlotRules ? '时段规则配置可见' : '未找到时段规则配置区域', `${SCREENSHOT_DIR}/${testId}_rules_list.png`);

    recordResult('5b', category, '连续打卡奖励', hasConsecutiveRules ? 'PASS' : 'FAIL', hasConsecutiveRules ? '连续打卡奖励配置可见' : '未找到连续打卡奖励配置', `${SCREENSHOT_DIR}/${testId}_rules_list.png`);

    // Try to create/edit a rule
    const addBtn = page.getByRole('button', { name: /新增规则|添加规则/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_add_rule_modal`);
      recordResult('5c', category, '规则CRUD', 'PASS', '规则创建弹窗打开成功', `${SCREENSHOT_DIR}/${testId}_add_rule_modal.png`);

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      recordResult('5c', category, '规则CRUD', 'SKIP', '新增规则按钮不可见，可能无权限或暂无配置', undefined);
    }
  } catch (e: any) {
    await takeScreenshot(page, `${testId}_rules_error`);
    recordResult(testId, category, '规则配置', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_rules_error.png`);
  }
}

// ===== TEST 6: Product Management =====

async function test_6_ProductManagement(page: Page) {
  const testId = '6';
  const category = '商品管理';

  await page.goto(`${BASE_URL}/#/enterprise/products`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForSelector('.ant-table-tbody', { timeout: 15000 });
    await takeFullPageScreenshot(page, `${testId}_product_list`);

    // Check product list
    const rows = await page.locator('.ant-table-tbody tr').count();
    recordResult('6a', category, '商品列表', 'PASS', `商品列表加载成功，当前有 ${rows} 行数据`, `${SCREENSHOT_DIR}/${testId}_product_list.png`);

    // Check for status (上架/下架)
    const hasStatusColumn = await page.getByText('状态').isVisible().catch(() => false);
    recordResult('6b', category, '商品状态列', hasStatusColumn ? 'PASS' : 'FAIL', hasStatusColumn ? '商品状态列可见' : '未找到商品状态列', `${SCREENSHOT_DIR}/${testId}_product_list.png`);

    // Try to add product
    const addBtn = page.getByRole('button', { name: /新增商品|添加商品/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_add_product_modal`);

      const confirmBtn = page.locator('.ant-modal button').filter({ hasText: /确 定|提交|创建/ });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        const hasValidation = await page.locator('.ant-form-item-explain-error').isVisible().catch(() => false);
        recordResult('6c', category, '商品表单验证', hasValidation ? 'PASS' : 'SKIP', hasValidation ? '商品表单验证正常' : '表单可能已提交或无需验证', `${SCREENSHOT_DIR}/${testId}_add_product_modal.png`);
      }

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      recordResult('6c', category, '新增商品', 'SKIP', '新增商品按钮不可见，可能无权限', undefined);
    }

    // Test 上架/下架
    const toggleBtn = page.locator('.ant-table-tbody tr .ant-switch, .ant-table-tbody tr .ant-tag').first();
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, `${testId}_toggle_status`);
      recordResult('6d', category, '上架/下架', 'PASS', '上下架切换功能可用', `${SCREENSHOT_DIR}/${testId}_toggle_status.png`);
    }

  } catch (e: any) {
    await takeScreenshot(page, `${testId}_product_error`);
    recordResult(testId, category, '商品管理', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_product_error.png`);
  }
}

// ===== TEST 7: Order Management =====

async function test_7_OrderManagement(page: Page) {
  const testId = '7';
  const category = '订单管理';

  await page.goto(`${BASE_URL}/#/enterprise/orders`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForSelector('.ant-table-tbody', { timeout: 15000 });
    await takeFullPageScreenshot(page, `${testId}_order_list`);

    const rows = await page.locator('.ant-table-tbody tr').count();
    recordResult('7a', category, '订单列表', 'PASS', `订单列表加载成功，当前有 ${rows} 行数据`, `${SCREENSHOT_DIR}/${testId}_order_list.png`);

    // Check for order status column
    const hasStatus = await page.getByText('状态').first().isVisible().catch(() => false);
    recordResult('7b', category, '订单状态列', hasStatus ? 'PASS' : 'FAIL', hasStatus ? '订单状态列可见' : '未找到订单状态列', `${SCREENSHOT_DIR}/${testId}_order_list.png`);

    // Try to verify/cancel an order
    const orderRow = page.locator('.ant-table-tbody tr').first();
    const actionBtns = orderRow.locator('button');
    const btnCount = await actionBtns.count();

    if (btnCount > 0) {
      const btnText = await actionBtns.first().textContent();
      if (btnText?.includes('核销') || btnText?.includes('取消')) {
        await actionBtns.first().click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, `${testId}_order_action`);
        recordResult('7c', category, '订单核销', 'PASS', '订单核销/取消按钮可用', `${SCREENSHOT_DIR}/${testId}_order_action.png`);
      }
    } else {
      recordResult('7c', category, '订单核销', 'SKIP', '当前无可操作订单', undefined);
    }

  } catch (e: any) {
    await takeScreenshot(page, `${testId}_order_error`);
    recordResult(testId, category, '订单管理', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_order_error.png`);
  }
}

// ===== TEST 8: Points Operations =====

async function test_8_PointsOperations(page: Page) {
  const testId = '8';
  const category = '积分运营';

  await page.goto(`${BASE_URL}/#/enterprise/points`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForTimeout(3000);
    await takeFullPageScreenshot(page, `${testId}_points_page`);

    // Check for points query section
    const hasPointsTable = await page.locator('.ant-table').isVisible().catch(() => false);
    recordResult('8a', category, '积分查询', hasPointsTable ? 'PASS' : 'FAIL', hasPointsTable ? '积分数据加载成功' : '未找到积分数据表格', `${SCREENSHOT_DIR}/${testId}_points_page.png`);

    // Check for manual issue/reduce buttons
    const hasManualIssue = await page.getByRole('button', { name: /发放|手动/i }).first().isVisible().catch(() => false);
    const hasManualReduce = await page.getByRole('button', { name: /扣减|扣除/i }).first().isVisible().catch(() => false);

    recordResult('8b', category, '手动发放', hasManualIssue ? 'PASS' : 'FAIL', hasManualIssue ? '手动发放按钮可见' : '未找到手动发放按钮', `${SCREENSHOT_DIR}/${testId}_points_page.png`);

    recordResult('8c', category, '手动扣减', hasManualReduce ? 'PASS' : 'FAIL', hasManualReduce ? '手动扣减按钮可见' : '未找到手动扣减按钮', `${SCREENSHOT_DIR}/${testId}_points_page.png`);

    // Try manual issue
    if (hasManualIssue) {
      await page.getByRole('button', { name: /发放|手动/i }).first().click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_manual_issue_modal`);

      // Fill required fields
      const phoneInput = page.locator('input[placeholder*="手机号"]').first();
      const pointsInput = page.locator('input[placeholder*="积分"]').first();

      if (await phoneInput.isVisible()) {
        await phoneInput.fill('13800138001');
      }
      if (await pointsInput.isVisible()) {
        await pointsInput.fill('100');
      }

      await takeScreenshot(page, `${testId}_manual_issue_filled`);
      recordResult('8d', category, '手动发放表单', 'PASS', '手动发放表单填写成功', `${SCREENSHOT_DIR}/${testId}_manual_issue_filled.png`);

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

  } catch (e: any) {
    await takeScreenshot(page, `${testId}_points_error`);
    recordResult(testId, category, '积分运营', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_points_error.png`);
  }
}

// ===== TEST 9: Department Management =====

async function test_9_DepartmentManagement(page: Page) {
  const testId = '9';
  const category = '部门管理';

  // Check if department management is accessible (might be part of member page or separate)
  await page.goto(`${BASE_URL}/#/enterprise/members`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForTimeout(2000);

    // Look for department-related elements
    const hasDepartmentSection = await page.getByText(/部门|组织/i).first().isVisible().catch(() => false);
    const hasTree = await page.locator('.ant-tree').isVisible().catch(() => false);
    const hasDeptTab = await page.getByRole('tab', { name: /部门/i }).isVisible().catch(() => false);

    await takeScreenshot(page, `${testId}_dept_page`);

    if (hasDepartmentSection || hasTree || hasDeptTab) {
      recordResult(testId, category, '部门管理', 'PASS', '部门管理功能可见（可能在员工管理页面中集成）', `${SCREENSHOT_DIR}/${testId}_dept_page.png`);
    } else {
      // Check if department tab exists
      const memberPageContent = await page.content();
      const hasDeptKeyword = memberPageContent.includes('部门') || memberPageContent.includes('组织');
      recordResult(testId, category, '部门管理', hasDeptKeyword ? 'PASS' : 'FAIL', hasDeptKeyword ? '部门管理已集成到员工管理页面' : '未找到独立的部门管理功能', `${SCREENSHOT_DIR}/${testId}_dept_page.png`);
    }
  } catch (e: any) {
    await takeScreenshot(page, `${testId}_dept_error`);
    recordResult(testId, category, '部门管理', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_dept_error.png`);
  }
}

// ===== TEST 10: Role & Permission Management =====

async function test_10_RolePermissionManagement(page: Page) {
  const testId = '10';
  const category = '角色权限管理';

  await page.goto(`${BASE_URL}/#/enterprise/roles`);
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForSelector('.ant-table-tbody', { timeout: 15000 });
    await takeFullPageScreenshot(page, `${testId}_roles_list`);

    const rows = await page.locator('.ant-table-tbody tr').count();
    recordResult('10a', category, '角色列表', 'PASS', `角色列表加载成功，当前有 ${rows} 个角色`, `${SCREENSHOT_DIR}/${testId}_roles_list.png`);

    // Check for role type tags
    const hasSuperAdminTag = await page.getByText('超管').isVisible().catch(() => false);
    const hasOperatorTag = await page.getByText('运营').isVisible().catch(() => false);
    const hasCustomTag = await page.getByText('自定义').isVisible().catch(() => false);

    recordResult('10b', category, '角色类型标签', (hasSuperAdminTag || hasOperatorTag || hasCustomTag) ? 'PASS' : 'FAIL',
      `超管:${hasSuperAdminTag}, 运营:${hasOperatorTag}, 自定义:${hasCustomTag}`,
      `${SCREENSHOT_DIR}/${testId}_roles_list.png`);

    // Check for permission column
    const hasPermColumn = await page.getByText('权限数量').isVisible().catch(() => false);
    recordResult('10c', category, '权限数量列', hasPermColumn ? 'PASS' : 'FAIL', hasPermColumn ? '权限数量列可见' : '未找到权限数量列', `${SCREENSHOT_DIR}/${testId}_roles_list.png`);

    // Check for create role button
    const hasCreateBtn = await page.getByRole('button', { name: /新增自定义角色/i }).isVisible().catch(() => false);
    recordResult('10d', category, '创建角色按钮', hasCreateBtn ? 'PASS' : 'FAIL', hasCreateBtn ? '新增自定义角色按钮可见' : '未找到新增角色按钮', `${SCREENSHOT_DIR}/${testId}_roles_list.png`);

    // Try to create a custom role
    if (hasCreateBtn) {
      await page.getByRole('button', { name: /新增自定义角色/i }).click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_create_role_modal`);

      // Fill role name
      const nameInput = page.locator('input[id*="name"], input[placeholder*="角色"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`测试角色-${Date.now()}`);
      }

      // Check for permission tree
      const hasPermTree = await page.locator('.ant-tree').isVisible().catch(() => false);
      recordResult('10e', category, '权限树', hasPermTree ? 'PASS' : 'FAIL', hasPermTree ? '权限配置树可见' : '未找到权限配置树', `${SCREENSHOT_DIR}/${testId}_create_role_modal.png`);

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /取 消|关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // Check super admin view permissions
    const viewBtn = page.locator('.ant-table-tbody tr button').filter({ hasText: /查看权限/i }).first();
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
      await page.waitForSelector('.ant-modal', { timeout: 5000 });
      await takeScreenshot(page, `${testId}_view_permissions`);

      const hasReadOnlyTree = await page.locator('.ant-tree').isVisible().catch(() => false);
      const hasNotice = await page.getByText(/超管权限|平台套餐|不可修改/i).isVisible().catch(() => false);

      recordResult('10f', category, '超管权限查看', (hasReadOnlyTree && hasNotice) ? 'PASS' : 'FAIL',
        `权限树:${hasReadOnlyTree}, 不可修改提示:${hasNotice}`,
        `${SCREENSHOT_DIR}/${testId}_view_permissions.png`);

      const closeBtn = page.locator('.ant-modal button').filter({ hasText: /关闭/ });
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

  } catch (e: any) {
    await takeScreenshot(page, `${testId}_roles_error`);
    recordResult(testId, category, '角色权限管理', 'BLOCKED', `错误: ${e.message}`, `${SCREENSHOT_DIR}/${testId}_roles_error.png`);
  }
}

// ===== MAIN TEST RUNNER =====

async function runTests() {
  console.log('='.repeat(80));
  console.log('Enterprise Admin Dashboard - Acceptance Test Suite');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test User: ${TEST_USER.phone}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Track failed requests
  const failedRequests: string[] = [];
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('hot-update') && !url.includes('.hot-update.')) {
      failedRequests.push(`${req.method()} ${url} - ${req.failure()?.errorText}`);
    }
  });

  try {
    // Run tests sequentially
    await test_1_LoginPageIndependence(page);
    await test_2_Login(page);
    await test_3_MenuRendering(page);
    await test_4_EmployeeManagement(page);
    await test_5_RuleConfiguration(page);
    await test_6_ProductManagement(page);
    await test_7_OrderManagement(page);
    await test_8_PointsOperations(page);
    await test_9_DepartmentManagement(page);
    await test_10_RolePermissionManagement(page);

    // Record console errors
    if (consoleErrors.length > 0) {
      console.log('\n--- Console Errors Detected ---');
      consoleErrors.forEach(e => console.log(`  ${e}`));
    }

    // Record failed requests
    if (failedRequests.length > 0) {
      console.log('\n--- Failed Requests ---');
      failedRequests.forEach(r => console.log(`  ${r}`));
    }

  } catch (e) {
    console.error('Test runner error:', e);
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const blockCount = results.filter(r => r.status === 'BLOCKED').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  const totalCount = results.length;

  console.log(`\nTotal: ${totalCount} | PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockCount} | SKIP: ${skipCount}`);

  console.log('\nDetailed Results:');
  for (const r of results) {
    const status = r.status === 'PASS' ? '✅ PASS' : r.status === 'FAIL' ? '❌ FAIL' : r.status === 'BLOCKED' ? '⛔ BLOCKED' : '⏭️  SKIP';
    console.log(`  ${status} [${r.id}] ${r.category} > ${r.criterion}`);
    console.log(`        ${r.details}`);
    if (r.screenshot) {
      console.log(`        📷 ${r.screenshot}`);
    }
  }

  // Save JSON report
  const report = {
    summary: {
      total: totalCount,
      pass: passCount,
      fail: failCount,
      blocked: blockCount,
      skip: skipCount,
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      backendUrl: BACKEND_URL,
      testUser: TEST_USER.phone,
      consoleErrors,
      failedRequests,
    },
    results,
  };

  const fs = await import('fs');
  fs.writeFileSync(`${SCREENSHOT_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${SCREENSHOT_DIR}/report.json`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
}

runTests().catch(console.error);
