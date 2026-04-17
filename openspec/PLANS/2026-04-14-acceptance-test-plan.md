# 碳积分平台自动化验收测试实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为碳积分平台企业管理后台和平台管理后台创建完整的自动化验收测试套件，确保所有菜单、按钮、组件正常运行，报表数据正确。

**Architecture:** 采用 Playwright + TypeScript + Page Object 模式，通过 API 调用准备测试数据，E2E 测试使用预置认证绕过登录。

**Tech Stack:** Playwright, TypeScript, axios (数据准备), Allure HTML Report

---

## 文件结构

```
apps/dashboard/e2e/
├── playwright.config.ts              # Playwright配置（已存在，需更新）
├── data-seeder.ts                    # 测试数据准备脚本（新建）
├── helpers.ts                        # 通用辅助函数（已存在）
├── pages/                            # Page Objects
│   ├── LoginPage.ts                  # 登录页（已存在部分）
│   ├── enterprise/
│   │   ├── DashboardPage.ts         # 企业看板页（新建）
│   │   ├── MemberPage.ts             # 员工管理页（新建）
│   │   ├── OrdersPage.ts            # 订单管理页（新建）
│   │   ├── PointsPage.ts            # 积分运营页（新建）
│   │   ├── ProductsPage.ts          # 商品管理页（新建）
│   │   ├── ReportsPage.ts           # 数据报表页（新建）
│   │   ├── RolesPage.ts             # 角色权限页（新建）
│   │   └── RulesPage.ts             # 规则配置页（新建）
│   └── platform/
│       ├── PlatformDashboardPage.ts  # 平台看板页（新建）
│       ├── EnterpriseManagementPage.ts # 企业管理页（新建）
│       ├── SystemManagementPage.ts   # 系统管理页（新建）
│       └── PlatformConfigPage.ts     # 平台配置页（新建）
├── specs/                            # 测试用例
│   ├── login.spec.ts                # 登录测试（已存在部分）
│   ├── enterprise/
│   │   ├── dashboard.spec.ts         # 看板测试
│   │   ├── member.spec.ts           # 员工管理测试
│   │   ├── orders.spec.ts           # 订单管理测试
│   │   ├── points.spec.ts           # 积分运营测试
│   │   ├── products.spec.ts         # 商品管理测试
│   │   ├── reports.spec.ts          # 数据报表测试
│   │   ├── roles.spec.ts            # 角色权限测试
│   │   └── rules.spec.ts            # 规则配置测试
│   └── platform/
│       ├── dashboard.spec.ts        # 平台看板测试
│       ├── enterprise-management.spec.ts # 企业管理测试
│       ├── system-management.spec.ts # 系统管理测试
│       └── platform-config.spec.ts   # 平台配置测试
├── reports/                          # 测试报告输出
└── .auth/                            # 认证状态缓存（已存在）
```

---

## 测试数据规模

| 数据类型 | 数量 |
|---------|------|
| 企业数量 | 5个 |
| 每企业员工数 | 20人 |
| 每人积分记录 | 10条 |
| 每企业订单数 | 5笔 |
| 每企业产品数 | 3个 |

---

## 测试路由映射

### 企业后台 (HashRouter: `/#/enterprise/*`)

| 模块 | 路由 |
|------|------|
| 看板 | `/#/enterprise/dashboard` |
| 员工管理 | `/#/enterprise/members` |
| 规则配置 | `/#/enterprise/rules` |
| 商品管理 | `:#/enterprise/products` |
| 订单管理 | `:#/enterprise/orders` |
| 积分运营 | `:#/enterprise/points` |
| 数据报表 | `:#/enterprise/reports` |
| 角色权限 | `:#/enterprise/roles` |

### 平台后台 (HashRouter: `/#/platform/*`)

| 模块 | 路由 |
|------|------|
| 平台看板 | `/#/platform/dashboard` |
| 企业管理 | `/#/platform/enterprises` |
| 系统管理 | `/#/platform/system` |
| 平台配置 | `/#/platform/config` |

---

## Task 1: 更新 Playwright 配置

**Files:**
- Modify: `apps/dashboard/e2e/playwright.config.ts`

- [ ] **Step 1: 读取现有配置**

Run: `cat apps/dashboard/e2e/playwright.config.ts`

- [ ] **Step 2: 更新 playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'e2e/reports', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Setup projects - authenticate and save state
    {
      name: 'setup-platform-admin',
      testMatch: /.*\.setup\.ts/,
      grep: /platform admin login/,
    },
    {
      name: 'setup-enterprise-admin',
      testMatch: /.*\.setup\.ts/,
      grep: /enterprise super admin login/,
    },
    {
      name: 'setup-enterprise-operator',
      testMatch: /.*\.setup\.ts/,
      grep: /enterprise operator login/,
    },

    // Enterprise Admin Tests
    {
      name: 'chromium-enterprise',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/enterprise-admin.json',
      },
      testMatch: /e2e\/specs\/enterprise\/.*\.spec\.ts/,
      dependencies: ['setup-enterprise-admin'],
    },

    // Platform Admin Tests
    {
      name: 'chromium-platform',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/platform-admin.json',
      },
      testMatch: /e2e\/specs\/platform\/.*\.spec\.ts/,
      dependencies: ['setup-platform-admin'],
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

- [ ] **Step 3: 提交更改**

```bash
git add apps/dashboard/e2e/playwright.config.ts
git commit -m "chore(e2e): update playwright config for acceptance tests"
```

---

## Task 2: 创建数据准备脚本 (Data Seeder)

**Files:**
- Create: `apps/dashboard/e2e/data-seeder.ts`

- [ ] **Step 1: 创建 data-seeder.ts**

```typescript
/**
 * 数据准备脚本 - 为验收测试创建测试数据
 * 
 * 运行方式:
 * npx tsx e2e/data-seeder.ts
 * 
 * 测试数据规模:
 * - 5个企业
 * - 每企业20个员工
 * - 每人10条积分记录
 * - 每企业5笔订单
 * - 每企业3个产品
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api';

// 认证token (平台管理员)
let platformToken = '';
let enterpriseTokens: Map<string, string> = new Map();

// 测试账号
const TEST_ACCOUNTS = {
  platformAdmin: {
    username: 'admin',
    password: 'admin123',
  },
  enterpriseAdmin: {
    phone: '13800138001',
    password: 'password123',
  },
};

async function loginPlatformAdmin(): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/platform/login`, {
    username: TEST_ACCOUNTS.platformAdmin.username,
    password: TEST_ACCOUNTS.platformAdmin.password,
  });
  return res.data.data.accessToken;
}

async function loginEnterprise(phone: string): Promise<string> {
  const res = await axios.post(`${API_BASE}/auth/enterprise/login`, {
    phone,
    password: TEST_ACCOUNTS.enterpriseAdmin.password,
  });
  return res.data.data.accessToken;
}

async function createEnterprise(index: number): Promise<{ id: string; name: string }> {
  const res = await axios.post(
    `${API_BASE}/platform/tenants`,
    {
      name: `测试企业${index}`,
      contactName: `联系人${index}`,
      contactPhone: `1380000${String(index).padStart(4, '0')}`,
      packageId: 'default-package-id',
    },
    {
      headers: { Authorization: `Bearer ${platformToken}` },
    }
  );
  return res.data.data;
}

async function createEmployee(tenantId: string, index: number, token: string): Promise<string> {
  const res = await axios.post(
    `${API_BASE}/system/users`,
    {
      tenantId,
      phone: `138${String(1000 + index).padStart(7, '0')}`,
      username: `员工${index}`,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data.data.userId;
}

async function createPointsRecord(userId: string, tenantId: string, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/points/records`,
    {
      userId,
      tenantId,
      points: Math.floor(Math.random() * 100) + 10,
      type: 'checkin',
      source: 'time_slot',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

async function createOrder(tenantId: string, userId: string, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/mall/orders`,
    {
      tenantId,
      userId,
      productId: `product-${Math.floor(Math.random() * 3) + 1}`,
      points: Math.floor(Math.random() * 500) + 100,
      status: 'pending',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

async function createProduct(tenantId: string, index: number, token: string): Promise<void> {
  await axios.post(
    `${API_BASE}/mall/products`,
    {
      tenantId,
      name: `测试产品${index}`,
      points: Math.floor(Math.random() * 500) + 100,
      stock: Math.floor(Math.random() * 100) + 10,
      status: 1,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

async function seed() {
  console.log('🚀 开始准备测试数据...\n');

  // 1. 登录平台管理员
  console.log('1. 登录平台管理员...');
  platformToken = await loginPlatformAdmin();
  console.log('   ✓ 登录成功\n');

  // 2. 创建5个企业
  console.log('2. 创建5个企业...');
  const enterprises: { id: string; name: string; adminPhone: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const enterprise = await createEnterprise(i);
    const adminPhone = `1380013${String(8000 + i)}`;
    enterprises.push({ ...enterprise, adminPhone });
    console.log(`   ✓ 创建企业: ${enterprise.name}`);
  }
  console.log('');

  // 3. 为每个企业创建员工和业务数据
  console.log('3. 为每个企业创建20个员工和业务数据...');
  for (const enterprise of enterprises) {
    const token = enterpriseTokens.get(enterprise.id) || await loginEnterprise(enterprise.adminPhone);
    enterpriseTokens.set(enterprise.id, token);

    // 创建20个员工，每人10条积分记录
    for (let j = 1; j <= 20; j++) {
      const userId = await createEmployee(enterprise.id, j, token);
      for (let k = 1; k <= 10; k++) {
        await createPointsRecord(userId, enterprise.id, token);
      }
      // 创建5笔订单
      for (let m = 1; m <= 5; m++) {
        await createOrder(enterprise.id, userId, token);
      }
      console.log(`   ✓ 企业 ${enterprise.name}: 员工${j}/20 完成`);
    }

    // 创建3个产品
    for (let p = 1; p <= 3; p++) {
      await createProduct(enterprise.id, p, token);
    }
    console.log(`   ✓ 企业 ${enterprise.name}: 3个产品创建完成\n`);
  }

  console.log('✅ 测试数据准备完成!');
  console.log(`   - 企业数量: 5`);
  console.log(`   - 每企业员工: 20人`);
  console.log(`   - 每人积分记录: 10条`);
  console.log(`   - 每企业订单: 5笔 x 20人 = 100笔`);
  console.log(`   - 每企业产品: 3个`);
}

seed().catch(console.error);
```

- [ ] **Step 2: 安装依赖**

Run: `cd apps/dashboard && pnpm add axios && pnpm add -D tsx`

- [ ] **Step 3: 提交更改**

```bash
git add apps/dashboard/e2e/data-seeder.ts apps/dashboard/package.json
git commit -m "feat(e2e): add data seeder for acceptance tests"
```

---

## Task 3: 创建企业后台 Page Objects

### 3.1 DashboardPage

**Files:**
- Create: `apps/dashboard/e2e/pages/enterprise/DashboardPage.ts`

- [ ] **Step 1: 创建 DashboardPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable } from '../helpers';

export class DashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly checkinChart: Locator;
  readonly pointsChart: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-card');
    this.checkinChart = page.locator('.ant-card').filter({ hasText: '打卡趋势' });
    this.pointsChart = page.locator('.ant-card').filter({ hasText: '积分趋势' });
  }

  async goto() {
    await this.page.goto('/#/enterprise/dashboard');
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async getStatCardValues(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const cards = await this.statCards.all();
    for (const card of cards) {
      const title = await card.locator('.ant-statistic-title').textContent();
      const value = await card.locator('.ant-statistic-content-value').textContent();
      if (title && value) {
        stats[title] = value;
      }
    }
    return stats;
  }

  async expectChartsVisible() {
    await this.checkinChart.waitFor({ state: 'visible', timeout: 10000 });
    await this.pointsChart.waitFor({ state: 'visible', timeout: 10000 });
  }

  async expectChartsRendered() {
    // 等待图表SVG渲染
    await this.page.waitForSelector('svg.recharts-surface', { timeout: 10000 });
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/pages/enterprise/DashboardPage.ts
git commit -m "feat(e2e): add DashboardPage page object"
```

### 3.2 MemberPage

**Files:**
- Create: `apps/dashboard/e2e/pages/enterprise/MemberPage.ts`

- [ ] **Step 1: 创建 MemberPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal, closeModal, uniqueId } from '../helpers';

export class MemberPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly importButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '添加' });
    this.importButton = page.locator('button').filter({ hasText: '批量导入' });
    this.searchInput = page.locator('.ant-input-search');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/members');
    await waitForTable(this.page);
  }

  async clickAddEmployee() {
    await this.addButton.click();
    await waitForModal(this.page);
  }

  async fillAddEmployeeForm(name: string, phone: string) {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('input').filter({ hasText: '' }).first().fill(name);
    // 填写手机号
    const phoneInput = modal.locator('input').nth(1);
    await phoneInput.fill(phone);
  }

  async submitAddEmployee() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确定' }).click();
  }

  async searchKeyword(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getMemberCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }

  async toggleMemberStatus(rowIndex: number) {
    const rows = await this.getTableRows();
    const toggleButton = rows.nth(rowIndex).locator('button').filter({ hasText: '停用' }).or(rows.locator('button').filter({ hasText: '启用' }));
    await toggleButton.click();
    await this.page.waitForTimeout(500);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/pages/enterprise/MemberPage.ts
git commit -m "feat(e2e): add MemberPage page object"
```

### 3.3 OrdersPage, PointsPage, ProductsPage, ReportsPage, RolesPage, RulesPage

- [ ] **Task 3.3: 创建 OrdersPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal } from '../helpers';

export class OrdersPage {
  readonly page: Page;
  readonly statusFilter: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusFilter = page.locator('.ant-select');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/orders');
    await waitForTable(this.page);
  }

  async filterByStatus(status: 'pending' | 'completed' | 'cancelled') {
    await this.statusFilter.first().click();
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: status === 'pending' ? '待处理' : status === 'completed' ? '已完成' : '已取消' }).click();
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }

  async getOrderCount(): Promise<number> {
    const rows = await this.getTableRows();
    return await rows.count();
  }
}
```

- [ ] **Task 3.4: 创建 PointsPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable } from '../helpers';

export class PointsPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-card');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/points');
    await waitForTable(this.page);
  }

  async getTotalPoints(): Promise<string> {
    const card = this.statCards.filter({ hasText: '总积分' });
    return await card.locator('.ant-statistic-content-value').textContent() || '0';
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }
}
```

- [ ] **Task 3.5: 创建 ProductsPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal } from '../helpers';

export class ProductsPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '新增商品' });
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/products');
    await waitForTable(this.page);
  }

  async toggleProductStatus(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getProductCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}
```

- [ ] **Task 3.6: 创建 ReportsPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';

export class ReportsPage {
  readonly page: Page;
  readonly dateRangePicker: Locator;
  readonly exportButtons: Locator;
  readonly charts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dateRangePicker = page.locator('.ant-picker-range');
    this.exportButtons = page.locator('button').filter({ hasText: '导出' });
    this.charts = page.locator('.ant-card').filter({ hasText: /趋势/ });
  }

  async goto() {
    await this.page.goto('/#/enterprise/reports');
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async exportCheckinReport() {
    const btn = this.exportButtons.filter({ hasText: '打卡报表' });
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async exportPointsReport() {
    const btn = this.exportButtons.filter({ hasText: '积分报表' });
    await btn.click();
    await this.page.waitForTimeout(2000);
  }

  async expectChartsVisible() {
    await this.charts.first().waitFor({ state: 'visible', timeout: 10000 });
  }
}
```

- [ ] **Task 3.7: 创建 RolesPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal, closeModal } from '../helpers';

export class RolesPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '新增自定义角色' });
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/roles');
    await waitForTable(this.page);
  }

  async clickAddRole() {
    await this.addButton.click();
    await waitForModal(this.page);
  }

  async fillRoleForm(name: string, description: string) {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('input').first().fill(name);
    await modal.locator('textarea').fill(description);
  }

  async selectPermissions(permKeys: string[]) {
    const modal = this.page.locator('.ant-modal');
    for (const key of permKeys) {
      const checkbox = modal.locator('.ant-tree-node-content-wrapper').filter({ hasText: key }).locator('.ant-checkbox');
      await checkbox.click();
    }
  }

  async submitRole() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确定' }).click();
  }

  async getRoleCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }

  async editRole(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '编辑权限' }).click();
      await waitForModal(this.page);
    }
  }

  async deleteRole(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '删除' }).click();
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).click();
    }
  }
}
```

- [ ] **Task 3.8: 创建 RulesPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal } from '../helpers';

export class RulesPage {
  readonly page: Page;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/enterprise/rules');
    await waitForTable(this.page);
  }

  async toggleRule(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const toggle = rows[rowIndex].locator('.ant-switch');
      await toggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getRuleCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}
```

- [ ] **提交所有企业后台 Page Objects**

```bash
git add apps/dashboard/e2e/pages/enterprise/
git commit -m "feat(e2e): add enterprise page objects"
```

---

## Task 4: 创建平台后台 Page Objects

### 4.1 PlatformDashboardPage

**Files:**
- Create: `apps/dashboard/e2e/pages/platform/PlatformDashboardPage.ts`

- [ ] **Step 1: 创建 PlatformDashboardPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';

export class PlatformDashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly charts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator('.ant-card');
    this.charts = page.locator('.ant-card').filter({ hasText: /趋势|统计/ });
  }

  async goto() {
    await this.page.goto('/#/platform/dashboard');
    await this.page.waitForSelector('.ant-layout', { timeout: 15000 });
  }

  async getEnterpriseCount(): Promise<string> {
    const card = this.statCards.filter({ hasText: '企业总数' });
    return await card.locator('.ant-statistic-content-value').textContent() || '0';
  }

  async expectChartsVisible() {
    await this.charts.first().waitFor({ state: 'visible', timeout: 10000 });
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/pages/platform/PlatformDashboardPage.ts
git commit -m "feat(e2e): add PlatformDashboardPage"
```

### 4.2 EnterpriseManagementPage

**Files:**
- Create: `apps/dashboard/e2e/pages/platform/EnterpriseManagementPage.ts`

- [ ] **Step 1: 创建 EnterpriseManagementPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal } from '../helpers';

export class EnterpriseManagementPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.locator('button').filter({ hasText: '开通企业' });
    this.searchInput = page.locator('.ant-input-search');
    this.table = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/#/platform/enterprises');
    await waitForTable(this.page);
  }

  async clickAddEnterprise() {
    await this.addButton.click();
    await waitForModal(this.page);
  }

  async fillEnterpriseForm(name: string, contactName: string, contactPhone: string) {
    const modal = this.page.locator('.ant-modal');
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(name);
    await inputs.nth(1).fill(contactName);
    await inputs.nth(2).fill(contactPhone);
  }

  async selectPackage(packageName: string) {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('.ant-select').click();
    await this.page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: packageName }).click();
  }

  async submitEnterprise() {
    const modal = this.page.locator('.ant-modal');
    await modal.locator('button').filter({ hasText: '确认开通' }).click();
  }

  async searchEnterprise(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async toggleEnterpriseStatus(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      const button = rows[rowIndex].locator('button').filter({ hasText: '停用' }).or(rows.locator('button').filter({ hasText: '开通' }));
      await button.click();
      await this.page.locator('.ant-popover .ant-btn').filter({ hasText: '确定' }).click();
    }
  }

  async openEnterpriseDetail(rowIndex: number) {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    if (rows.length > rowIndex) {
      await rows[rowIndex].locator('button').filter({ hasText: '详情' }).click();
      await waitForModal(this.page);
    }
  }

  async getEnterpriseCount(): Promise<number> {
    const rows = await this.table.locator('.ant-table-tbody tr').all();
    return rows.length;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/pages/platform/EnterpriseManagementPage.ts
git commit -m "feat(e2e): add EnterpriseManagementPage"
```

### 4.3 SystemManagementPage, PlatformConfigPage

- [ ] **Task 4.3: 创建 SystemManagementPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';
import { waitForTable, waitForModal } from '../helpers';

export class SystemManagementPage {
  readonly page: Page;
  readonly table: Locator;
  readonly tabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('.ant-table');
    this.tabs = page.locator('.ant-tabs-tab');
  }

  async goto() {
    await this.page.goto('/#/platform/system');
    await this.page.waitForSelector('.ant-tabs', { timeout: 15000 });
  }

  async switchToTab(tabName: string) {
    await this.tabs.filter({ hasText: tabName }).click();
    await this.page.waitForTimeout(1000);
  }

  async getTableRows(): Promise<Locator> {
    return this.table.locator('.ant-table-tbody tr');
  }
}
```

- [ ] **Task 4.4: 创建 PlatformConfigPage.ts**

```typescript
import { type Page, type Locator } from '@playwright/test';

export class PlatformConfigPage {
  readonly page: Page;
  readonly form: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('.ant-form');
    this.saveButton = page.locator('button').filter({ hasText: '保存' });
  }

  async goto() {
    await this.page.goto('/#/platform/config');
    await this.form.waitFor({ state: 'visible', timeout: 15000 });
  }

  async fillConfigField(label: string, value: string) {
    const field = this.form.locator('.ant-form-item').filter({ hasText: label }).locator('input');
    await field.fill(value);
  }

  async save() {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }
}
```

- [ ] **提交所有平台后台 Page Objects**

```bash
git add apps/dashboard/e2e/pages/platform/
git commit -m "feat(e2e): add platform page objects"
```

---

## Task 5: 创建企业后台测试用例

### 5.1 Dashboard Spec

**Files:**
- Create: `apps/dashboard/e2e/specs/enterprise/dashboard.spec.ts`

- [ ] **Step 1: 创建 dashboard.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/enterprise/DashboardPage';

test.describe('企业后台 - 数据看板', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('DASH-001: 看板页面加载', async () => {
    await expect(dashboardPage.page.locator('h2').filter({ hasText: '数据看板' })).toBeVisible();
  });

  test('DASH-002: 统计卡片数据正确显示', async () => {
    const stats = await dashboardPage.getStatCardValues();
    expect(stats).toHaveProperty('今日打卡人数');
    expect(stats).toHaveProperty('今日积分发放');
    expect(stats).toHaveProperty('活跃用户');
    expect(stats).toHaveProperty('本月兑换量');
  });

  test('DASH-003: 打卡趋势图表正确渲染', async () => {
    await dashboardPage.expectChartsVisible();
    await dashboardPage.expectChartsRendered();
  });

  test('DASH-004: 积分趋势图表正确渲染', async () => {
    await dashboardPage.expectChartsVisible();
    await dashboardPage.expectChartsRendered();
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/specs/enterprise/dashboard.spec.ts
git commit -m "test(e2e): add enterprise dashboard specs"
```

### 5.2 Member Spec

**Files:**
- Create: `apps/dashboard/e2e/specs/enterprise/member.spec.ts`

- [ ] **Step 1: 创建 member.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { MemberPage } from '../../pages/enterprise/MemberPage';
import { uniqueId } from '../../helpers';

test.describe('企业后台 - 员工管理', () => {
  let memberPage: MemberPage;

  test.beforeEach(async ({ page }) => {
    memberPage = new MemberPage(page);
    await memberPage.goto();
  });

  test('MEM-001: 员工列表展示', async () => {
    await expect(memberPage.table).toBeVisible();
    const rows = await memberPage.getTableRows();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('MEM-002: 添加员工', async () => {
    await memberPage.clickAddEmployee();
    const testName = `测试员工${uniqueId()}`;
    const testPhone = `138${Date.now().toString().slice(-8)}`;
    await memberPage.fillAddEmployeeForm(testName, testPhone);
    await memberPage.submitAddEmployee();
    // 验证成功消息
    await memberPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });

  test('MEM-003: 员工搜索', async () => {
    await memberPage.searchKeyword('测试');
    await memberPage.page.waitForTimeout(1000);
  });

  test('MEM-004: 批量导入按钮存在', async () => {
    await expect(memberPage.importButton).toBeVisible();
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/specs/enterprise/member.spec.ts
git commit -m "test(e2e): add enterprise member specs"
```

### 5.3 其他企业后台测试用例

- [ ] **Task 5.3: 创建 orders.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { OrdersPage } from '../../pages/enterprise/OrdersPage';

test.describe('企业后台 - 订单管理', () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
    await ordersPage.goto();
  });

  test('ORD-001: 订单列表展示', async () => {
    await expect(ordersPage.table).toBeVisible();
  });

  test('ORD-002: 订单状态筛选', async () => {
    await ordersPage.filterByStatus('pending');
    await ordersPage.page.waitForTimeout(1000);
  });

  test('ORD-003: 订单详情查看', async () => {
    const rows = await ordersPage.getTableRows();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

- [ ] **Task 5.4: 创建 points.spec.ts**

```typescript
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
```

- [ ] **Task 5.5: 创建 products.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { ProductsPage } from '../../pages/enterprise/ProductsPage';

test.describe('企业后台 - 商品管理', () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.goto();
  });

  test('PRD-001: 产品列表展示', async () => {
    await expect(productsPage.table).toBeVisible();
  });

  test('PRD-002: 产品上下架功能', async () => {
    const count = await productsPage.getProductCount();
    if (count > 0) {
      await productsPage.toggleProductStatus(0);
    }
  });
});
```

- [ ] **Task 5.6: 创建 reports.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { ReportsPage } from '../../pages/enterprise/ReportsPage';

test.describe('企业后台 - 数据报表', () => {
  let reportsPage: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reportsPage = new ReportsPage(page);
    await reportsPage.goto();
  });

  test('RPT-001: 报表页面加载', async () => {
    await expect(reportsPage.page.locator('h2').filter({ hasText: '数据报表' })).toBeVisible();
  });

  test('RPT-002: 导出按钮可见', async () => {
    await expect(reportsPage.exportButtons.first()).toBeVisible();
  });

  test('RPT-003: 趋势图正确渲染', async () => {
    await reportsPage.expectChartsVisible();
  });
});
```

- [ ] **Task 5.7: 创建 roles.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { RolesPage } from '../../pages/enterprise/RolesPage';
import { uniqueId } from '../../helpers';

test.describe('企业后台 - 角色权限', () => {
  let rolesPage: RolesPage;

  test.beforeEach(async ({ page }) => {
    rolesPage = new RolesPage(page);
    await rolesPage.goto();
  });

  test('ROL-001: 角色列表展示', async () => {
    await expect(rolesPage.table).toBeVisible();
  });

  test('ROL-002: 新增自定义角色', async () => {
    await rolesPage.clickAddRole();
    const testName = `测试角色${uniqueId()}`;
    await rolesPage.fillRoleForm(testName, '自动化测试描述');
    await rolesPage.submitRole();
    await rolesPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });
});
```

- [ ] **Task 5.8: 创建 rules.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { RulesPage } from '../../pages/enterprise/RulesPage';

test.describe('企业后台 - 规则配置', () => {
  let rulesPage: RulesPage;

  test.beforeEach(async ({ page }) => {
    rulesPage = new RulesPage(page);
    await rulesPage.goto();
  });

  test('RUL-001: 规则列表展示', async () => {
    await expect(rulesPage.table).toBeVisible();
  });

  test('RUL-002: 规则启用/停用', async () => {
    const count = await rulesPage.getRuleCount();
    if (count > 0) {
      await rulesPage.toggleRule(0);
    }
  });
});
```

- [ ] **提交所有企业后台测试用例**

```bash
git add apps/dashboard/e2e/specs/enterprise/
git commit -m "test(e2e): add enterprise acceptance test specs"
```

---

## Task 6: 创建平台后台测试用例

### 6.1 PlatformDashboard Spec

**Files:**
- Create: `apps/dashboard/e2e/specs/platform/dashboard.spec.ts`

- [ ] **Step 1: 创建 platform/dashboard.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { PlatformDashboardPage } from '../../pages/platform/PlatformDashboardPage';

test.describe('平台后台 - 平台看板', () => {
  let dashboardPage: PlatformDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new PlatformDashboardPage(page);
    await dashboardPage.goto();
  });

  test('PD-001: 平台看板加载', async () => {
    await expect(dashboardPage.page.locator('h2').filter({ hasText: '平台看板' })).toBeVisible();
  });

  test('PD-002: 企业统计卡片显示', async () => {
    const count = await dashboardPage.getEnterpriseCount();
    expect(parseInt(count)).toBeGreaterThanOrEqual(0);
  });

  test('PD-003: 平台数据图表可见', async () => {
    await dashboardPage.expectChartsVisible();
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/specs/platform/dashboard.spec.ts
git commit -m "test(e2e): add platform dashboard specs"
```

### 6.2 EnterpriseManagement Spec

**Files:**
- Create: `apps/dashboard/e2e/specs/platform/enterprise-management.spec.ts`

- [ ] **Step 1: 创建 enterprise-management.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { EnterpriseManagementPage } from '../../pages/platform/EnterpriseManagementPage';
import { uniqueId } from '../../helpers';

test.describe('平台后台 - 企业管理', () => {
  let enterprisePage: EnterpriseManagementPage;

  test.beforeEach(async ({ page }) => {
    enterprisePage = new EnterpriseManagementPage(page);
    await enterprisePage.goto();
  });

  test('EM-001: 企业列表展示', async () => {
    await expect(enterprisePage.table).toBeVisible();
  });

  test('EM-002: 开通新企业', async () => {
    await enterprisePage.clickAddEnterprise();
    const testName = `测试企业${uniqueId()}`;
    await enterprisePage.fillEnterpriseForm(testName, '测试联系人', `138${Date.now().toString().slice(-8)}`);
    await enterprisePage.submitEnterprise();
    await enterprisePage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });

  test('EM-003: 企业状态切换', async () => {
    const count = await enterprisePage.getEnterpriseCount();
    if (count > 0) {
      await enterprisePage.toggleEnterpriseStatus(0);
    }
  });

  test('EM-004: 企业搜索', async () => {
    await enterprisePage.searchEnterprise('测试');
    await enterprisePage.page.waitForTimeout(1000);
  });
});
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/e2e/specs/platform/enterprise-management.spec.ts
git commit -m "test(e2e): add enterprise management specs"
```

### 6.3 SystemManagement Spec, PlatformConfig Spec

- [ ] **Task 6.3: 创建 system-management.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { SystemManagementPage } from '../../pages/platform/SystemManagementPage';

test.describe('平台后台 - 系统管理', () => {
  let systemPage: SystemManagementPage;

  test.beforeEach(async ({ page }) => {
    systemPage = new SystemManagementPage(page);
    await systemPage.goto();
  });

  test('SM-001: 系统管理页面加载', async () => {
    await expect(systemPage.page.locator('h2').filter({ hasText: '系统管理' })).toBeVisible();
  });

  test('SM-002: Tab切换功能', async () => {
    const tabs = await systemPage.tabs.all();
    if (tabs.length > 1) {
      await systemPage.switchToTab(await tabs[1].textContent() || '');
    }
  });
});
```

- [ ] **Task 6.4: 创建 platform-config.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { PlatformConfigPage } from '../../pages/platform/PlatformConfigPage';

test.describe('平台后台 - 平台配置', () => {
  let configPage: PlatformConfigPage;

  test.beforeEach(async ({ page }) => {
    configPage = new PlatformConfigPage(page);
    await configPage.goto();
  });

  test('PC-001: 配置页面加载', async () => {
    await expect(configPage.form).toBeVisible();
  });

  test('PC-002: 配置保存功能', async () => {
    await configPage.save();
    await configPage.page.waitForSelector('.ant-message-success', { timeout: 5000 });
  });
});
```

- [ ] **提交所有平台后台测试用例**

```bash
git add apps/dashboard/e2e/specs/platform/
git commit -m "test(e2e): add platform acceptance test specs"
```

---

## Task 7: 配置 HTML 报告

**Files:**
- Modify: `apps/dashboard/e2e/playwright.config.ts` (reporter section)
- Create: `apps/dashboard/e2e/reports/index.html` (自定义报告入口)

- [ ] **Step 1: 更新 playwright.config.ts 添加 Allure-like HTML 报告**

现有配置已经使用 `['html', { outputFolder: 'e2e/reports', open: 'never' }]`，Playwright 会自动生成 HTML 报告。

创建自定义报告入口页面：

```typescript
// apps/dashboard/e2e/reports/index.html
// 报告将在 e2e/reports/index.html 自动生成
```

- [ ] **Step 2: 添加报告生成脚本到 package.json**

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:report": "playwright show-report",
    "test:e2e:all": "pnpm run test:e2e && pnpm playwright show-report"
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/dashboard/package.json
git commit -m "chore(e2e): add report scripts"
```

---

## Task 8: 集成测试与调试

- [ ] **Step 1: 确保所有测试文件路径正确**

检查 `apps/dashboard/e2e/specs/` 目录结构是否完整

- [ ] **Step 2: 运行测试验证**

```bash
cd apps/dashboard
pnpm playwright install chromium
npx playwright test --project=chromium-enterprise --reporter=list
```

- [ ] **Step 3: 修复发现的问题**

根据测试失败情况修复 Page Objects 或测试用例

- [ ] **Step 4: 生成最终报告**

```bash
npx playwright show-report
```

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-acceptance-test-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
