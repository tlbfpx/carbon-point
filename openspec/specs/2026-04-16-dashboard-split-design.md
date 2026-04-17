# Dashboard 拆分为两个独立前端应用

## 1. 目标

将 `apps/dashboard/` 拆分为两个独立应用，各自由独立团队使用，独立部署：

| 应用 | 用途 | 用户 |
|---|---|---|
| `apps/multi-tenant-frontend/` | 平台管理后台 | 平台运营人员 |
| `apps/enterprise-frontend/` | 企业后台 | 各企业管理员 |

**现状说明：** `apps/dashboard/` 已有两个 HTML 入口和两个 React 入口：
- `index.html` → `src/main.tsx` → `EnterpriseApp`（HashRouter，`/#/enterprise/*`）
- `platform.html` → `src/platform_main.tsx` → `PlatformApp`（HashRouter，`/#/platform/*`）

两个应用共享 `src/shared/` 下的 API、store、hooks、components。当前打包成单一 artifact（`dist/dashboard/`），通过不同 URL 路径访问。目标是拆分为两个完全独立的构建产物。

## 2. 目录结构

```
apps/
├── multi-tenant-frontend/     # 新建，平台管理后台
│   ├── src/
│   │   ├── main.tsx          # 入口
│   │   ├── App.tsx           # 路由 + 布局
│   │   ├── pages/            # 平台页面组件（迁移自 dashboard/src/platform/pages）
│   │   ├── api/              # 平台 API（见 Section 4）
│   │   │   ├── request.ts    # 含 platformApiClient（baseURL: /platform）
│   │   │   └── auth.ts       # 平台版 auth（调用 /platform/auth/*）
│   │   ├── store/
│   │   │   └── authStore.ts  # 平台版 authStore（localStorage key: carbon-platform-auth）
│   │   ├── hooks/            # 迁移自 dashboard/src/shared/hooks
│   │   ├── components/      # 迁移自 dashboard/src/shared/components
│   │   ├── directives/      # 迁移自 dashboard/src/shared/directives
│   │   └── pages/           # 迁移自 dashboard/src/shared/pages/PlatformLoginPage
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── package.json
│
├── enterprise-frontend/       # 新建，企业后台
│   ├── src/
│   │   ├── main.tsx          # 入口
│   │   ├── App.tsx           # 路由 + 布局
│   │   ├── pages/            # 企业页面组件（迁移自 dashboard/src/enterprise/pages）
│   │   ├── api/              # 企业 API（见 Section 4）
│   │   │   ├── request.ts    # 含 apiClient（baseURL: /api）
│   │   │   └── auth.ts       # 企业版 auth（调用 /api/auth/*）
│   │   ├── store/
│   │   │   └── authStore.ts  # 企业版 authStore（localStorage key: carbon-enterprise-auth）
│   │   ├── hooks/            # 迁移自 dashboard/src/shared/hooks
│   │   ├── components/       # 迁移自 dashboard/src/shared/components
│   │   ├── directives/      # 迁移自 dashboard/src/shared/directives
│   │   └── pages/            # 迁移自 dashboard/src/shared/pages/LoginPage
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── package.json
│
└── dashboard/                 # 保留，完成迁移后归档或删除
```

## 3. 路由策略

两个应用均使用 HistoryRouter，各自有独立根路径：

| 应用 | 目标域名 | 路由示例 |
|---|---|---|
| multi-tenant-frontend | `platform.carbon-point.com` | `platform.carbon-point.com/dashboard` |
| enterprise-frontend | `enterprise.carbon-point.com` | `enterprise.carbon-point.com/dashboard` |

**平台后台路由（迁移自 `dashboard/src/platform/`）：**

| 路由 | 页面组件 | 说明 |
|---|---|---|
| `/dashboard` | `PlatformDashboard` | 平台看板 |
| `/enterprises` | `EnterpriseManagement` | 企业管理 |
| `/system/users` | `SystemUsers` | 用户管理 |
| `/system/roles` | `SystemRoles` | 角色管理 |
| `/system/logs` | `OperationLogs` | 操作日志 |
| `/system/dict` | `DictManagement` | 字典管理 |
| `/features/products` | `ProductManagement` | 产品管理 |
| `/features/features` | `FeatureLibrary` | 功能点库 |
| `/packages` | `PackageManagement` | 套餐管理 |
| `/config` | `PlatformConfig` | 平台配置 |
| `/login` | `PlatformLoginPage` | 登录页（HistoryRouter 下正常可见） |

**企业后台路由（迁移自 `dashboard/src/enterprise/`）：**

| 路由 | 页面组件 | 说明 |
|---|---|---|
| `/dashboard` | `Dashboard` | 数据看板 |
| `/members` | `Member` | 员工管理 |
| `/rules` | `Rules` | 规则配置 |
| `/products` | `Products` | 商品管理 |
| `/orders` | `Orders` | 订单管理 |
| `/points` | `Points` | 积分运营 |
| `/reports` | `Reports` | 数据报表 |
| `/roles` | `Roles` | 角色权限 |
| `/branding` | `Branding` | 品牌配置 |
| `/login` | `LoginPage` | 登录页 |

**重要：当前 HashRouter 路由前缀处理**

现有代码使用 HashRouter（`/#/platform/*` 和 `/#/enterprise/*`）。迁移到 HistoryRouter 后：
- 平台后台：`/#/platform/dashboard` → `/dashboard`
- 企业后台：`/#/enterprise/members` → `/members`

原有 HashRouter 路由前缀（`/platform/`、`/enterprise/`）在 HistoryRouter 下不再需要，改为按域名隔离。

## 4. API 模块拆分

### 4.1 现有架构分析

`dashboard/src/shared/api/request.ts` 已有两个独立的 Axios 客户端：

```typescript
// 企业后台用 apiClient，baseURL = /api（环境变量 VITE_API_BASE_URL）
export const apiClient = axios.create({ baseURL: BASE_URL });

// 平台后台用 platformApiClient，baseURL = /platform（环境变量 VITE_PLATFORM_API_BASE_URL）
export const platformApiClient = axios.create({ baseURL: PLATFORM_BASE_URL });
```

拆分后各自只保留自己需要的客户端。

### 4.2 multi-tenant-frontend API 模块

| 文件 | 内容 | 来源 |
|---|---|---|
| `request.ts` | `platformApiClient`（baseURL: `/platform`），401 拦截器 refresh 到 `/platform/auth/refresh` | 重写，迁移自 `shared/api/request.ts` |
| `auth.ts` | `login`, `logout`, `getCurrentUser`, `getPlatformMyPermissions`（使用 `platformApiClient`） | 重写，迁移自 `shared/api/auth.ts` |
| `platform.ts` | 平台配置相关 API | 迁移自 `shared/api/platform.ts` |
| `products.ts` | 产品管理 API | 迁移自 `shared/api/products.ts` |
| `reports.ts` | 平台报表 API | 迁移自 `shared/api/reports.ts` |

### 4.3 enterprise-frontend API 模块

| 文件 | 内容 | 来源 |
|---|---|---|
| `request.ts` | `apiClient`（baseURL: `/api`），401 拦截器 refresh 到 `/api/auth/refresh` | 重写，迁移自 `shared/api/request.ts` |
| `auth.ts` | `login`, `logout`, `getCurrentUser`, `getMyPermissions`（使用 `apiClient`） | 重写，迁移自 `shared/api/auth.ts` |
| `branding.ts` | 企业品牌配置 API | 迁移自 `shared/api/branding.ts` |
| `members.ts` | 员工管理 API | 迁移自 `shared/api/members.ts` |
| `orders.ts` | 订单管理 API | 迁移自 `shared/api/orders.ts` |
| `points.ts` | 积分运营 API | 迁移自 `shared/api/points.ts` |
| `products.ts` | 商品管理 API | 迁移自 `shared/api/products.ts` |
| `reports.ts` | 企业报表 API | 迁移自 `shared/api/reports.ts` |
| `roles.ts` | 角色权限 API | 迁移自 `shared/api/roles.ts` |
| `rules.ts` | 规则配置 API | 迁移自 `shared/api/rules.ts` |

## 5. AuthStore 拆分策略

### 5.1 现状

`dashboard/src/shared/store/authStore.ts` 使用单一 localStorage key：

```typescript
const STORAGE_KEY = 'carbon-dashboard-auth';  // 统一 key，两套入口共用
```

通过 `isPlatformAdmin` 标志位区分平台管理员和企业管理员：

```typescript
const isPlatform = get().user?.isPlatformAdmin;
const perms = isPlatform ? await getPlatformMyPermissions() : await getMyPermissions();
```

### 5.2 拆分方案

拆分后各自独立 localStorage key，完全隔离：

| 应用 | localStorage key | API client | 权限接口 |
|---|---|---|---|
| multi-tenant-frontend | `carbon-platform-auth` | `platformApiClient` | `getPlatformMyPermissions()` |
| enterprise-frontend | `carbon-enterprise-auth` | `apiClient` | `getMyPermissions()` |

两个应用各自有独立的 `authStore.ts`（含 `hydrate`/`login`/`logout`/`fetchPermissions`），不再共享状态。

## 6. 共享代码处理

| shared 模块 | multi-tenant | enterprise | 处理方式 |
|---|---|---|---|
| `request.ts` | ✅ | ✅ | 各自重写（见 Section 4） |
| `auth.ts` | ✅ | ✅ | 各自重写（见 Section 4） |
| `ErrorBoundary.tsx` | ✅ | ✅ | 复制到各自 `components/` |
| `usePermission.ts` | ✅ | ✅ | 复制到各自 `hooks/` |
| `v-permission.ts` | ✅ | ✅ | 复制到各自 `directives/` |
| `PlatformLoginPage.tsx` | ✅ | ❌ | 迁移到 `multi-tenant-frontend/src/pages/` |
| `LoginPage.tsx` | ❌ | ✅ | 迁移到 `enterprise-frontend/src/pages/` |

## 7. packages 处理

| package | multi-tenant | enterprise | 处理方式 |
|---|---|---|---|
| `@carbon-point/utils` | ✅ | ✅ | 复制 `src/logger.ts` 和 `src/index.ts` 到各自 `src/utils/` |
| `@carbon-point/hooks` | ✅ | ✅ | 复制 `src/useAuth.ts` 和 `src/index.ts` 到各自 `src/hooks/` |
| `@carbon-point/ui` | ✅ | ✅ | 复制 `src/index.ts`（当前为空）到各自 `src/ui/` |

注：`@carbon-point/api` 不再需要（已拆分为各自独立的 api 模块）。

## 8. 环境变量策略

每个应用独立 `.env` 文件：

### multi-tenant-frontend `.env`

```bash
VITE_APP_TITLE="平台管理后台"
VITE_PLATFORM_API_BASE_URL=/platform
VITE_API_BASE_URL=/api  # 仅用作 fallback
```

### enterprise-frontend `.env`

```bash
VITE_APP_TITLE="企业后台"
VITE_API_BASE_URL=/api
```

**重要：** `vite.config.ts` 中的 proxy 配置：

```typescript
// 两个应用共用相同 proxy 配置，指向同一个后端
proxy: {
  '/api': { target: 'http://localhost:8080', changeOrigin: true },
  '/platform': { target: 'http://localhost:8080', changeOrigin: true },
}
```

## 9. tsconfig 路径别名

各自独立 `tsconfig.json`，不再使用 `@/` 跨包引用，统一使用相对路径：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**注意：** 原来 `@carbon-point/utils` 等包别名在各自应用中不再存在，所有 import 改为相对路径或绝对路径（`src/*`）。

## 10. 构建与部署

### 独立构建

```bash
# 平台后台
cd apps/multi-tenant-frontend
pnpm install && pnpm build   # 输出到 dist/

# 企业后台
cd apps/enterprise-frontend
pnpm install && pnpm build   # 输出到 dist/
```

### 各自独立 Vite 配置

```typescript
// multi-tenant-frontend/vite.config.ts
export default defineConfig({
  base: '/',
  build: { outDir: 'dist' },
  // 不再有 rollupOptions.input.multiple，单独一个入口
});

// enterprise-frontend/vite.config.ts
export default defineConfig({
  base: '/',
  build: { outDir: 'dist' },
});
```

### 独立部署

| 应用 | 目标域名 | 输出目录 |
|---|---|---|
| multi-tenant-frontend | `platform.carbon-point.com` | `dist/` |
| enterprise-frontend | `enterprise.carbon-point.com` | `dist/` |

## 11. E2E 测试策略

当前 `apps/dashboard/e2e/` 包含 Playwright 测试，同时覆盖平台和企业两个后台。拆分后：

| 测试文件 | 对应应用 | 策略 |
|---|---|---|
| `test_enterprise_dashboard.py` | enterprise-frontend | 复制并适配 |
| `e2e_dashboard_ui.py` 等 | enterprise-frontend | 复制并适配 |
| `e2e/` 下平台相关测试 | multi-tenant-frontend | 复制并适配 |

两个应用各自独立 Playwright 配置（`playwright.config.ts`）：
- multi-tenant-frontend：`chromium-platform` 项目，baseURL `http://localhost:3000`
- enterprise-frontend：`chromium-enterprise` 项目，baseURL `http://localhost:3001`

**部署后测试：** GitHub Actions 中两个 workflow 独立运行各自的 e2e 测试套件。

## 12. 迁移步骤

### Phase 1: 创建新应用骨架
1. 创建 `apps/multi-tenant-frontend/` 和 `apps/enterprise-frontend/` 目录结构
2. 各自 `package.json` 引入必要依赖（antd, react-router-dom, @tanstack/react-query, axios, zustand 等）
3. 各自 `vite.config.ts`、`tsconfig.json`、`.env` 配置
4. 各自 `index.html` 入口

### Phase 2: 迁移共享代码
1. 复制 `packages/utils/src/` 到各自 `src/utils/`
2. 复制 `packages/hooks/src/` 到各自 `src/hooks/`（按需）
3. 复制 `packages/ui/src/` 到各自 `src/ui/`（按需）
4. 迁移 `shared/components/ErrorBoundary.tsx` 到各自 `components/`
5. 迁移 `shared/directives/v-permission.ts` 到各自 `directives/`
6. 迁移 `shared/hooks/usePermission.ts` 到各自 `hooks/`

### Phase 3: 迁移 API 模块（关键步骤）
1. **multi-tenant-frontend**: 重写 `api/request.ts`（基于 `platformApiClient`），迁移 `api/auth.ts`、`api/platform.ts` 等
2. **enterprise-frontend**: 重写 `api/request.ts`（基于 `apiClient`），迁移其余 API 模块

### Phase 4: 迁移 AuthStore
1. **multi-tenant-frontend**: 创建 `store/authStore.ts`（key: `carbon-platform-auth`）
2. **enterprise-frontend**: 创建 `store/authStore.ts`（key: `carbon-enterprise-auth`）

### Phase 5: 迁移页面组件
1. 迁移 `dashboard/src/platform/pages/` 到 `multi-tenant-frontend/src/pages/`
2. 迁移 `dashboard/src/enterprise/pages/` 到 `enterprise-frontend/src/pages/`
3. 迁移 `shared/pages/PlatformLoginPage.tsx` → `multi-tenant-frontend/src/pages/`
4. 迁移 `shared/pages/LoginPage.tsx` → `enterprise-frontend/src/pages/`

### Phase 6: 迁移 App 布局和路由
1. 将 `dashboard/src/PlatformApp.tsx` 逻辑迁移到 `multi-tenant-frontend/src/App.tsx`（HistoryRouter）
2. 将 `dashboard/src/EnterpriseApp.tsx` 逻辑迁移到 `enterprise-frontend/src/App.tsx`（HistoryRouter）
3. 更新各页面组件的 import 路径（从 `@/` 改为相对路径）

### Phase 7: 迁移 E2E 测试
1. 复制 `dashboard/e2e/` 相关测试到各自 `e2e/` 目录
2. 适配页面选择器和 URL 断言

### Phase 8: 验证
1. 两个应用独立 `pnpm build` 成功
2. 功能完整性验证（对比原有功能）
3. E2E 测试通过

### Phase 9: 清理
1. 确认新应用稳定运行后，可选择归档或删除 `apps/dashboard/`
2. 保留期：建议至少一个版本迭代后再删除

## 13. 回滚计划

如迁移过程中出现问题：
- 保留 `apps/dashboard/` 不删除，作为回滚版本
- 原 `dashboard/` 的 CI/CD 流程保持不变，直到新应用完全接管
