# Dashboard 拆分为两个独立前端应用

## 1. 目标

将 `apps/dashboard/` 拆分为两个独立应用，各自由独立团队使用，独立部署：

| 应用 | 用途 | 用户 |
|---|---|---|
| `apps/multi-tenant-frontend/` | 平台管理后台 | 平台运营人员 |
| `apps/enterprise-frontend/` | 企业后台 | 各企业管理员 |

## 2. 目录结构

```
apps/
├── multi-tenant-frontend/     # 新建，平台管理后台
│   ├── src/
│   │   ├── main.tsx           # 入口
│   │   ├── App.tsx            # 路由 + 布局
│   │   ├── pages/             # 平台页面组件（从 dashboard/src/platform 迁移）
│   │   ├── api/               # 平台用到的 API 模块
│   │   ├── store/             # 平台 authStore
│   │   ├── hooks/             # 平台 permission hooks
│   │   └── components/       # 平台专用组件
│   ├── vite.config.ts        # 独立构建配置
│   ├── index.html
│   └── package.json           # 独立依赖
│
├── enterprise-frontend/      # 新建，企业后台
│   ├── src/
│   │   ├── main.tsx           # 入口
│   │   ├── App.tsx            # 路由 + 布局
│   │   ├── pages/             # 企业页面组件（从 dashboard/src/enterprise 迁移）
│   │   ├── api/               # 企业用到的 API 模块
│   │   ├── store/             # 企业 authStore
│   │   ├── hooks/             # 企业 permission hooks
│   │   └── components/        # 企业专用组件
│   ├── vite.config.ts         # 独立构建配置
│   ├── index.html
│   └── package.json           # 独立依赖
│
└── dashboard/                 # 保留，完成迁移后归档或删除
```

## 3. 路由策略

两个应用均使用 HistoryRouter，各自有独立根路径：

| 应用 | 路由前缀 | URL 示例 |
|---|---|---|
| multi-tenant-frontend | `/` | `platform.carbon-point.com/` |
| enterprise-frontend | `/` | `enterprise.carbon-point.com/` |

**平台后台路由：**
- `/dashboard` — 平台看板
- `/enterprises` — 企业管理
- `/system/users` — 用户管理
- `/system/roles` — 角色管理
- `/system/logs` — 操作日志
- `/system/dict` — 字典管理
- `/features/products` — 产品管理
- `/features/features` — 功能点库
- `/packages` — 套餐管理

**企业后台路由：**
- `/dashboard` — 数据看板
- `/members` — 员工管理
- `/rules` — 规则配置
- `/products` — 商品管理
- `/orders` — 订单管理
- `/points` — 积分运营
- `/reports` — 数据报表
- `/roles` — 角色权限
- `/branding` — 品牌配置

## 4. API 模块拆分（按需复制）

### multi-tenant-frontend 需要的 API 模块

| 文件 | 来源 | 说明 |
|---|---|---|
| `request.ts` | `shared/api/request.ts` | 基础请求封装 |
| `auth.ts` | `shared/api/auth.ts`（平台版） | 平台管理员登录/登出 |
| `platform.ts` | `shared/api/platform.ts` | 平台配置相关 API |

### enterprise-frontend 需要的 API 模块

| 文件 | 来源 | 说明 |
|---|---|---|
| `request.ts` | `shared/api/request.ts` | 基础请求封装 |
| `auth.ts` | `shared/api/auth.ts`（企业版） | 企业管理员登录/登出 |
| `branding.ts` | `shared/api/branding.ts` | 企业品牌配置 API |
| `members.ts` | `shared/api/members.ts` | 员工管理 API |
| `orders.ts` | `shared/api/orders.ts` | 订单管理 API |
| `points.ts` | `shared/api/points.ts` | 积分运营 API |
| `products.ts` | `shared/api/products.ts` | 商品管理 API |
| `reports.ts` | `shared/api/reports.ts` | 数据报表 API |
| `roles.ts` | `shared/api/roles.ts` | 角色权限 API |
| `rules.ts` | `shared/api/rules.ts` | 规则配置 API |

## 5. 共享代码处理

| shared 模块 | multi-tenant | enterprise | 处理方式 |
|---|---|---|---|
| `request.ts` | ✅ | ✅ | 复制到各自 api/ |
| `auth.ts` | ✅ | ✅ | 各自版本（登录接口不同） |
| `ErrorBoundary.tsx` | ✅ | ✅ | 复制到各自 components/ |
| `usePermission.ts` | ✅ | ✅ | 复制到各自 hooks/ |
| `v-permission.ts` | ✅ | ✅ | 复制到各自 directives/ |
| `LoginPage.tsx` | ✅（PlatformLoginPage） | ✅（LoginPage） | 各自版本 |

## 6. packages 处理

| package | multi-tenant | enterprise | 处理方式 |
|---|---|---|---|
| `@carbon-point/utils` | ✅ | ✅ | 复制 `src/` 内容到各自 `src/utils/` |
| `@carbon-point/api` | ✅ | ✅ | 不再需要，通过各自 api/ 使用 |
| `@carbon-point/hooks` | ✅ | ✅ | 复制 `src/` 内容到各自 `src/hooks/` |
| `@carbon-point/ui` | ✅ | ✅ | 复制 `src/` 内容到各自 `src/ui/` |

## 7. 构建与部署

### 独立构建

两个应用各自独立构建，互不影响：

```bash
# 平台后台
cd apps/multi-tenant-frontend
pnpm install
pnpm build  # 输出到 dist/

# 企业后台
cd apps/enterprise-frontend
pnpm install
pnpm build  # 输出到 dist/
```

### 独立部署

| 应用 | 目标域名 | 部署方式 |
|---|---|---|
| multi-tenant-frontend | `platform.carbon-point.com` | 静态文件部署到 CDN/Nginx |
| enterprise-frontend | `enterprise.carbon-point.com` | 静态文件部署到 CDN/Nginx |

### Vite 配置要点

各自 `vite.config.ts` 独立配置：
- `base: '/'`（HistoryRouter 模式）
- `server.proxy` 指向同一个后端地址 `/api`
- 独立 `outDir`，如 `dist/platform` / `dist/enterprise`

## 8. 认证策略

- **平台管理员**：登录 `platform.carbon-point.com`，JWT token 存储在平台域名 cookie
- **企业管理员**：登录 `enterprise.carbon-point.com`，JWT token 存储在企业域名 cookie
- 两套用户体系完全独立，共享后端 `/api/auth/login` 认证接口（但 token payload 不同）
- 各自独立的 `authStore`，存储各自的用户信息和权限

## 9. 迁移步骤

### Phase 1: 创建新应用骨架
1. 创建 `apps/multi-tenant-frontend/` 目录结构
2. 创建 `apps/enterprise-frontend/` 目录结构
3. 各自 `package.json` 引入必要依赖（antd, react-router-dom, @tanstack/react-query, axios 等）
4. 各自 `vite.config.ts` 配置

### Phase 2: 迁移共享代码
1. 复制并定制 `packages/utils/src/` 到各自 `src/utils/`
2. 复制并定制 `packages/hooks/src/` 到各自 `src/hooks/`
3. 复制并定制 `packages/ui/src/` 到各自 `src/ui/`
4. 迁移 `shared/api/request.ts` 到各自 `api/`

### Phase 3: 迁移 API 模块
1. 迁移平台后台 API 模块到 `multi-tenant-frontend/src/api/`
2. 迁移企业后台 API 模块到 `enterprise-frontend/src/api/`

### Phase 4: 迁移页面组件
1. 迁移 `dashboard/src/platform/pages/` 到 `multi-tenant-frontend/src/pages/`
2. 迁移 `dashboard/src/enterprise/pages/` 到 `enterprise-frontend/src/pages/`

### Phase 5: 迁移路由和布局
1. 将 `dashboard/src/PlatformApp.tsx` 逻辑迁移到 `multi-tenant-frontend/src/App.tsx`
2. 将 `dashboard/src/EnterpriseApp.tsx` 逻辑迁移到 `enterprise-frontend/src/App.tsx`

### Phase 6: 清理
1. 验证两个应用独立构建成功
2. 验证功能完整性
3. 归档或删除原 `apps/dashboard/`（可选，保留一段时间用于对比）

## 10. 技术约束

- 两个应用必须保持与原 `dashboard/` 相同的功能完整性
- 共享后端 API 地址不变（`/api`）
- 迁移过程中不影响现有 `dashboard/` 的开发和部署
- 两个应用独立后，不应再有任何跨应用的 import 依赖
