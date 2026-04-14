# 碳积分管理后台架构重构设计方案

**日期**: 2026-04-14
**状态**: 已批准

## 背景

当前 `apps/dashboard` 是一个混合了平台管理后台和企业管理后台的 React 应用，通过 `isPlatformApp` 属性区分两个系统。这种架构导致：
- 路由配置复杂，需要条件判断
- 权限系统混淆（企业权限 vs 平台权限）
- 代码耦合，维护困难

## 目标

- `/platform/admin` → 平台管理后台（独立系统）
- `/enterprise/admin` → 企业管理后台（独立系统）

## 目录结构

```
apps/dashboard/src/
├── main.tsx                    # 企业后台入口
├── platform_main.tsx           # 平台后台入口
├── enterprise/
│   ├── EnterpriseApp.tsx      # 企业后台独立 App
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Member.tsx
│       ├── Rules.tsx
│       ├── Products.tsx
│       ├── Orders.tsx
│       ├── Points.tsx
│       ├── Reports.tsx
│       └── Roles.tsx
├── platform/
│   ├── PlatformApp.tsx         # 平台后台独立 App
│   └── pages/
│       ├── PlatformDashboard.tsx
│       ├── EnterpriseManagement.tsx
│       ├── SystemManagement.tsx
│       └── Config.tsx
├── shared/                    # 共享目录
│   ├── components/
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── usePermission.ts
│   │   └── usePermissions.ts
│   ├── api/
│   │   ├── request.ts
│   │   ├── auth.ts
│   │   ├── members.ts
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   ├── reports.ts
│   │   └── rules.ts
│   └── store/
│       └── authStore.ts
└── pages/
    ├── LoginPage.tsx           # 企业登录页
    └── platform/
        └── LoginPage.tsx       # 平台登录页
```

## 入口隔离

| 入口 | 渲染 | 路由前缀 | API Base URL |
|------|------|----------|--------------|
| `main.tsx` | `EnterpriseApp` | `/enterprise/` | `/api/` |
| `platform_main.tsx` | `PlatformApp` | `/platform/` | `/platform/` |

## App 组件职责

### EnterpriseApp.tsx
- 企业后台 React Router 配置
- 企业菜单：数据看板、员工管理、规则配置、商品管理、订单管理、积分运营、数据报表、角色权限
- 调用 `/api/permissions/my` 获取权限
- 使用 `apiClient`

### PlatformApp.tsx
- 平台后台 React Router 配置
- 平台菜单：平台看板、企业管理、系统管理、平台配置
- 调用 `/platform/permissions/my` 获取权限
- 使用 `platformApiClient`

## 共享策略

| 模块 | 共享方式 | 原因 |
|------|----------|------|
| `api/request.ts` | 直接共享 | 两个 client 已分离 |
| `store/authStore.ts` | 直接共享 | Zustand store，按需读取 |
| `components/` | 直接共享 | ErrorBoundary 等 |
| `hooks/` | 直接共享 | usePermission 等 |
| 登录页 | 各自独立 | 样式和逻辑略有不同 |

## 实施步骤

1. 创建 `enterprise/pages/` 目录，移动企业相关页面
2. 创建 `platform/pages/` 目录，移动平台相关页面
3. 创建 `shared/` 目录，移动共享代码
4. 创建 `EnterpriseApp.tsx`
5. 创建 `PlatformApp.tsx`
6. 修改入口文件 `main.tsx` 和 `platform_main.tsx`
7. 删除旧的 `App.tsx`
8. 更新 vite.config.ts 的 alias（如需要）
9. 测试两个入口是否正常工作

## 改动量估计

- 新建 2 个 App 文件
- 移动 10+ 个页面组件
- 创建 `shared/` 目录结构
- 修改 2 个入口文件
