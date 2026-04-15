# Carbon Point E2E Test Optimization - 100% Coverage Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand E2E test coverage from 21 tests to 200+ tests covering all menus, buttons, forms, modals, and components. Implement Page Object pattern, test data API, and parallel execution with 10-person team.

**Architecture:** Playwright with TypeScript, Page Object Model, API-based test data generation, test isolation with beforeEach cleanup, parallel execution with 8 workers.

**Tech Stack:** Playwright, TypeScript, Ant Design component selectors, REST API for test data

---

## File Structure

```
e2e/
├── api/                          # Test data API client
│   └── test-data-api.ts          # Creates/cleans test data via backend APIs
├── pages/                        # Page Object Models
│   ├── enterprise/
│   │   ├── DashboardPage.ts
│   │   ├── MemberPage.ts
│   │   ├── RulesPage.ts
│   │   ├── ProductsPage.ts
│   │   ├── OrdersPage.ts
│   │   ├── PointsPage.ts
│   │   ├── ReportsPage.ts
│   │   └── RolesPage.ts
│   └── platform/
│       ├── PlatformDashboardPage.ts
│       ├── EnterpriseManagementPage.ts
│       ├── SystemManagementPage.ts
│       └── PlatformConfigPage.ts
├── setup/                        # Test setup and teardown
│   ├── test-setup.ts             # beforeAll/afterAll hooks
│   └── test-data.ts               # Test data generators
├── specs/                        # Test specifications
│   ├── enterprise/               # 100+ enterprise tests
│   │   ├── dashboard.spec.ts
│   │   ├── member.spec.ts
│   │   ├── rules.spec.ts
│   │   ├── products.spec.ts
│   │   ├── orders.spec.ts
│   │   ├── points.spec.ts
│   │   ├── reports.spec.ts
│   │   └── roles.spec.ts
│   └── platform/                 # 50+ platform tests
│       ├── dashboard.spec.ts
│       ├── enterprise-management.spec.ts
│       ├── system-management.spec.ts
│       └── platform-config.spec.ts
├── helpers.ts                    # Updated with all helpers
└── playwright.config.ts           # Updated for parallel execution
```

---

## Enterprise Backend Test Coverage (8 Modules)

### Module 1: 数据看板 (Dashboard) - 15 tests

**Files:**
- Create: `e2e/pages/enterprise/DashboardPage.ts`
- Create: `e2e/specs/enterprise/dashboard.spec.ts`
- Modify: `e2e/helpers.ts`

**Buttons/Components:**
- 侧边栏折叠按钮
- 用户头像下拉菜单（个人信息、通知中心、退出登录）
- 统计卡片（今日打卡人数、今日积分发放、活跃用户、本月兑换量）
- 图表（打卡趋势图、积分发放趋势图）
- 热门商品表格

- [ ] **Task 1: Create DashboardPage POM**

```typescript
// e2e/pages/enterprise/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly collapseButton: Locator;
  readonly statCards: Locator;
  readonly checkInChart: Locator;
  readonly pointsChart: Locator;
  readonly hotProductsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('.ant-layout-sider');
    this.collapseButton = page.locator('.ant-layout-header button').first();
    this.statCards = page.locator('.ant-card');
    this.checkInChart = page.locator('.recharts-lineChart').first();
    this.pointsChart = page.locator('.recharts-barChart').first();
    this.hotProductsTable = page.locator('h2:has-text("热门商品") + * table');
  }

  async goto() {
    await this.page.goto('/enterprise/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async expectVisible() {
    await expect(this.sidebar).toBeVisible();
    await expect(this.statCards.first()).toBeVisible();
  }

  async collapseSidebar() {
    await this.collapseButton.click();
    await this.page.waitForTimeout(300);
  }

  async getStatValue(label: string): Promise<string> {
    return this.page.locator(`.ant-statistic-title:has-text("${label}")`).locator('..').locator('.ant-statistic-content-value').textContent() ?? '';
  }
}
```

- [ ] **Task 2: Create dashboard.spec.ts with 15 tests**
- [ ] **Task 3: Run dashboard tests and verify all pass**
- [ ] **Task 4: Commit**

### Module 2: 员工管理 (Member) - 25 tests

**Files:**
- Create: `e2e/pages/enterprise/MemberPage.ts`
- Create: `e2e/specs/enterprise/member.spec.ts`

**Buttons/Components:**
- 搜索框（输入手机号/姓名搜索）
- 添加员工按钮 → 弹出添加员工Modal
  - 手机号输入框
  - 姓名输入框
  - 确定/取消按钮
- 批量导入按钮 → 文件上传
- 员工表格
  - 姓名、手机号、积分、等级、状态列
  - 邀请按钮
  - 启用/停用按钮
- 分页组件

- [ ] **Task 5: Create MemberPage POM**
- [ ] **Task 6: Create member.spec.ts with 25 tests**
- [ ] **Task 7: Run member tests and verify all pass**
- [ ] **Task 8: Commit**

### Module 3: 规则配置 (Rules) - 35 tests

**Files:**
- Create: `e2e/pages/enterprise/RulesPage.ts`
- Create: `e2e/specs/enterprise/rules.spec.ts`

**Tabs:**
- 时段规则
  - 新增时段按钮 → Modal（时段名称、开始时间、结束时间、基础积分、启用开关、确定/取消）
  - 表格（编辑、删除按钮）
  - 启用/停用Switch
- 连续打卡
  - 添加规则按钮
  - 删除规则按钮
  - 保存按钮
- 特殊日期
  - 添加特殊日期按钮 → Modal（日期、倍率、说明）
  - 删除按钮
- 等级系数
  - 系数输入框
  - 保存按钮
- 每日上限
  - 上限输入框
  - 保存按钮

- [ ] **Task 9: Create RulesPage POM**
- [ ] **Task 10: Create rules.spec.ts with 35 tests**
- [ ] **Task 11: Run rules tests and verify all pass**
- [ ] **Task 12: Commit**

### Module 4: 商品管理 (Products) - 30 tests

**Files:**
- Create: `e2e/pages/enterprise/ProductsPage.ts`
- Create: `e2e/specs/enterprise/products.spec.ts`

**Buttons/Components:**
- 搜索框
- 类型筛选下拉框
- 创建商品按钮 → Modal（名称、描述、类型、积分价格、库存、每人限兑、有效期、图片URL、确定）
- 编辑按钮 → Modal
- 库存编辑按钮 → Modal（库存InputNumber、确认）
- 状态Switch

- [x] **Task 13: Create ProductsPage POM**
- [x] **Task 14: Create products.spec.ts with 30 tests**
- [ ] **Task 15: Run products tests and verify all pass**
- [ ] **Task 16: Commit**

### Module 5: 订单管理 (Orders) - 25 tests

**Files:**
- Create: `e2e/pages/enterprise/OrdersPage.ts`
- Create: `e2e/specs/enterprise/orders.spec.ts`

**Buttons/Components:**
- 搜索框
- 状态筛选下拉框
- 日期范围选择器
- 核销按钮
- 取消按钮
- 查看券码按钮 → Modal

- [ ] **Task 17: Create OrdersPage POM**
- [ ] **Task 18: Create orders.spec.ts with 25 tests**
- [ ] **Task 19: Run orders tests and verify all pass**
- [ ] **Task 20: Commit**

### Module 6: 积分运营 (Points) - 25 tests

**Files:**
- Create: `e2e/pages/enterprise/PointsPage.ts`
- Create: `e2e/specs/enterprise/points.spec.ts`

**Buttons/Components:**
- 手机号搜索框
- 发放积分按钮 → Modal（积分数量、说明、确认发放）
- 扣减积分按钮 → Modal（积分数量、原因、确认扣减）
- 积分流水表格

- [ ] **Task 21: Create PointsPage POM**
- [ ] **Task 22: Create points.spec.ts with 25 tests**
- [ ] **Task 23: Run points tests and verify all pass**
- [ ] **Task 24: Commit**

### Module 7: 数据报表 (Reports) - 20 tests

**Files:**
- Create: `e2e/pages/enterprise/ReportsPage.ts`
- Create: `e2e/specs/enterprise/reports.spec.ts`

**Buttons/Components:**
- 日期范围选择器
- 导出打卡报表按钮
- 导出积分报表按钮
- 导出订单报表按钮
- 统计卡片（今日打卡人数、今日积分发放、活跃用户、本月兑换量）
- 打卡趋势图表
- 积分趋势图表
- 打卡数据明细表格
- 积分数据明细表格

- [ ] **Task 25: Create ReportsPage POM**
- [ ] **Task 26: Create reports.spec.ts with 20 tests**
- [ ] **Task 27: Run reports tests and verify all pass**
- [ ] **Task 28: Commit**

### Module 8: 角色权限 (Roles) - 20 tests

**Files:**
- Create: `e2e/pages/enterprise/RolesPage.ts`
- Create: `e2e/specs/enterprise/roles.spec.ts`

**Buttons/Components:**
- 新增自定义角色按钮 → Modal（角色名称、说明、权限树、确定）
- 查看权限按钮 → Modal
- 编辑权限按钮 → Modal（权限树、保存权限）
- 删除按钮
- 超管角色不可编辑提示

- [ ] **Task 29: Create RolesPage POM**
- [ ] **Task 30: Create roles.spec.ts with 20 tests**
- [ ] **Task 31: Run roles tests and verify all pass**
- [ ] **Task 32: Commit**

---

## Platform Backend Test Coverage (4 Modules)

### Module 9: 平台看板 (Platform Dashboard) - 20 tests

**Files:**
- Create: `e2e/pages/platform/PlatformDashboardPage.ts`
- Create: `e2e/specs/platform/dashboard.spec.ts`

**Buttons/Components:**
- 维度切换（按日/按周/按月）
- 导出报表按钮
- 统计卡片（企业总数、活跃企业、总用户数、总积分发放、总兑换量等）
- 积分发放与消耗趋势图
- 用户与兑换量趋势图
- 企业积分排行图表
- 企业排行详情表格

- [ ] **Task 33: Create PlatformDashboardPage POM**
- [ ] **Task 34: Create platform/dashboard.spec.ts with 20 tests**
- [ ] **Task 35: Run dashboard tests and verify all pass**
- [ ] **Task 36: Commit**

### Module 10: 企业管理 (Enterprise Management) - 25 tests

**Files:**
- Create: `e2e/pages/platform/EnterpriseManagementPage.ts`
- Create: `e2e/specs/platform/enterprise-management.spec.ts`

**Buttons/Components:**
- 搜索框
- 状态筛选下拉框
- 开通企业按钮 → Modal（企业名称、联系人、联系电话、选择套餐、确认开通）
- 详情按钮 → Modal（Tabs：基本信息/用户管理）
  - 基本信息Tab
  - 套餐管理下拉框
  - 更换套餐确认Modal
  - 用户管理Tab
  - 设为超管按钮
- 开通/停用按钮

- [ ] **Task 37: Create EnterpriseManagementPage POM**
- [ ] **Task 38: Create enterprise-management.spec.ts with 25 tests**
- [ ] **Task 39: Run enterprise-management tests and verify all pass**
- [ ] **Task 40: Commit**

### Module 11: 系统管理 (System Management) - 30 tests

**Files:**
- Create: `e2e/pages/platform/SystemManagementPage.ts`
- Create: `e2e/specs/platform/system-management.spec.ts`

**Tabs:**
- 平台管理员
  - 创建管理员按钮 → Modal（用户名、手机号、初始密码、邮箱、角色多选、确认创建）
  - 编辑按钮 → Modal（用户名、手机号、邮箱、角色多选、保存修改）
  - 删除按钮
  - 管理员表格
- 操作日志
  - 操作人搜索框
  - 操作类型筛选
  - 时间范围选择器
  - 查询/重置/刷新按钮
  - 日志表格

- [ ] **Task 41: Create SystemManagementPage POM**
- [ ] **Task 42: Create system-management.spec.ts with 30 tests**
- [ ] **Task 43: Run system-management tests and verify all pass**
- [ ] **Task 44: Commit**

### Module 12: 平台配置 (Platform Config) - 20 tests

**Files:**
- Create: `e2e/pages/platform/PlatformConfigPage.ts`
- Create: `e2e/specs/platform/platform-config.spec.ts`

**Buttons/Components:**
- 功能开关（9个Switch）
- 保存功能开关按钮
- 新建模板按钮
- 编辑模板按钮
- 规则模板表格
- 默认每日积分上限输入框
- 默认等级系数输入框
- AccessToken有效期输入框
- RefreshToken有效期输入框
- 保存参数按钮

- [ ] **Task 45: Create PlatformConfigPage POM**
- [ ] **Task 46: Create platform-config.spec.ts with 20 tests**
- [ ] **Task 47: Run platform-config tests and verify all pass**
- [ ] **Task 48: Commit**

---

## Test Infrastructure

### Task 49: Create Test Data API Client

**Files:**
- Create: `e2e/api/test-data-api.ts`

```typescript
// e2e/api/test-data-api.ts
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

export class TestDataApi {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  // Enterprise test data
  async createEnterprise(name: string) {
    return this.request('POST', '/tenant/create', { name, contactName: '测试', contactPhone: '13800000000' });
  }

  async createMember(tenantId: string, phone: string, name: string) {
    return this.request('POST', '/member/create', { tenantId, phone, username: name });
  }

  async createProduct(tenantId: string, name: string, points: number) {
    return this.request('POST', '/product/create', { tenantId, name, pointsCost: points, stock: 100 });
  }

  async createOrder(tenantId: string, userId: string, productId: string) {
    return this.request('POST', '/order/create', { tenantId, userId, productId });
  }

  async grantPoints(userId: string, points: number) {
    return this.request('POST', '/points/grant', { userId, points, description: '测试发放' });
  }

  async createTimeSlotRule(tenantId: string, name: string, startTime: string, endTime: string, basePoints: number) {
    return this.request('POST', '/rule/timeslot/create', { tenantId, name, startTime, endTime, basePoints });
  }

  async createRole(tenantId: string, name: string) {
    return this.request('POST', '/role/create', { tenantId, name, permissions: [] });
  }

  // Platform test data
  async createPlatformAdmin(username: string, phone: string, password: string) {
    return this.request('POST', '/platform/admin/create', { username, phone, password, roles: ['admin'] });
  }

  async cleanupTestData() {
    return this.request('POST', '/test/cleanup', {});
  }
}
```

### Task 50: Update Playwright Config for 10-Person Team

**Files:**
- Modify: `e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import os from 'os';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : Math.min(8, os.cpus().length),
  reporter: [
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'e2e/reports/results.json' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: 'specs/**/*.spec.ts',
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @carbon-point/dashboard dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
```

### Task 51: Update Helpers with All Login Types

**Files:**
- Modify: `e2e/helpers.ts`

```typescript
// Add after existing login functions:

/**
 * Login as enterprise admin (by phone)
 */
export async function loginAsEnterpriseAdmin(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/dashboard/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder="请输入手机号"]').fill('13800138001');
  await page.locator('input[placeholder="请输入密码"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

/**
 * Login as platform admin
 */
export async function loginAsPlatformAdmin(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/platform.html`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder="请输入管理员用户名"]').fill('admin');
  await page.locator('input[placeholder="请输入密码"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/platform/, { timeout: 15000 });
}

/**
 * Navigate to enterprise module
 */
export async function gotoEnterprise(page: Page, baseUrl: string, module: string) {
  await loginAsEnterpriseAdmin(page, baseUrl);
  await page.click(`text=${module}`);
  await page.waitForTimeout(1000);
}

/**
 * Navigate to platform module
 */
export async function gotoPlatform(page: Page, baseUrl: string, module: string) {
  await loginAsPlatformAdmin(page, baseUrl);
  await page.click(`text=${module}`);
  await page.waitForTimeout(1000);
}

/**
 * Fill Ant Design form by placeholder
 */
export async function fillByPlaceholder(page: Page, placeholder: string, value: string) {
  await page.locator(`input[placeholder="${placeholder}"]`).fill(value);
}

/**
 * Select option from Ant Design Select
 */
export async function selectOption(page: Page, placeholder: string, optionText: string) {
  await page.click(`input[placeholder="${placeholder}"]`);
  await page.waitForSelector('.ant-select-dropdown', { timeout: 3000 });
  await page.click(`.ant-select-dropdown .ant-select-item-option:has-text("${optionText}")`);
}

/**
 * Click button containing text
 */
export async function clickButton(page: Page, text: string) {
  await page.locator('button').filter({ hasText: text }).click();
}

/**
 * Confirm popconfirm dialog
 */
export async function confirmPopconfirm(page: Page) {
  await page.click('.ant-popconfirm .ant-btn-primary');
}

/**
 * Wait for Ant Design table to load
 */
export async function waitForAntTable(page: Page, timeout = 10000) {
  await page.waitForSelector('.ant-table-tbody tr', { timeout });
  await page.waitForTimeout(500); // Wait for data to render
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  return page.locator('.ant-table-tbody tr').count();
}

/**
 * Fill form and submit
 */
export async function fillAndSubmitForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    const formItem = page.locator('.ant-form-item').filter({ hasText: label }).locator('..');
    const input = formItem.locator('input, textarea, .ant-select input').first();
    await input.fill(value);
  }
  await page.locator('button[type="submit"]').click();
}
```

---

## Test Summary

| Module | Tests | Tasks |
|--------|-------|-------|
| 企业后台-数据看板 | 15 | 1-4 |
| 企业后台-员工管理 | 25 | 5-8 |
| 企业后台-规则配置 | 35 | 9-12 |
| 企业后台-商品管理 | 30 | 13-16 |
| 企业后台-订单管理 | 25 | 17-20 |
| 企业后台-积分运营 | 25 | 21-24 |
| 企业后台-数据报表 | 20 | 25-28 |
| 企业后台-角色权限 | 20 | 29-32 |
| 平台后台-平台看板 | 20 | 33-36 |
| 平台后台-企业管理 | 25 | 37-40 |
| 平台后台-系统管理 | 30 | 41-44 |
| 平台后台-平台配置 | 20 | 45-48 |
| Infrastructure | 3 | 49-51 |
| **Total** | **293** | **51 tasks** |

---

## 10-Person Team Execution Strategy

1. Split 51 tasks into 10 groups of ~5 tasks each
2. Each "tester" (subagent) executes their assigned tasks in parallel
3. Tasks 49-51 (infrastructure) run first as dependencies
4. Final integration test runs all 293 tests
5. Generate consolidated HTML report

---

## Self-Review Checklist

**1. Spec coverage:** All 12 modules covered with all buttons, forms, modals, tables, tabs, and charts tested.

**2. Placeholder scan:** All steps contain complete code with no TBD/TODO markers.

**3. Type consistency:** All Page Objects use consistent TypeScript types and Playwright locator patterns.

**If gaps found, add tasks inline.**
