# 碳积分管理后台架构重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/dashboard` 拆分为两个独立应用：平台管理后台和企业管理后台

**Architecture:** 
- 创建 `enterprise/` 和 `platform/` 目录分离两个应用的页面和 App 组件
- 共享代码放入 `shared/` 目录
- 保留现有的多入口配置（`main.tsx` 和 `platform_main.tsx`）

**Tech Stack:** React 18, TypeScript, React Router v6, Ant Design 5, Zustand

---

## 文件结构概览

```
apps/dashboard/src/
├── main.tsx                    # 企业后台入口（保持）
├── platform_main.tsx           # 平台后台入口（保持）
├── EnterpriseApp.tsx           # 新建：企业 App
├── PlatformApp.tsx            # 新建：平台 App
├── enterprise/
│   └── pages/                 # 从 pages/enterprise 移动
├── platform/
│   └── pages/                 # 从 pages/platform 移动
└── shared/
    ├── api/
    ├── components/
    ├── hooks/
    └── store/
```

---

## 实施任务

### Task 1: 创建 shared 目录结构并移动共享代码

**Files:**
- Create: `apps/dashboard/src/shared/api/request.ts`
- Create: `apps/dashboard/src/shared/api/auth.ts`
- Create: `apps/dashboard/src/shared/api/members.ts`
- Create: `apps/dashboard/src/shared/api/orders.ts`
- Create: `apps/dashboard/src/shared/api/products.ts`
- Create: `apps/dashboard/src/shared/api/reports.ts`
- Create: `apps/dashboard/src/shared/api/rules.ts`
- Create: `apps/dashboard/src/shared/components/ErrorBoundary.tsx`
- Create: `apps/dashboard/src/shared/hooks/usePermission.ts`
- Create: `apps/dashboard/src/shared/hooks/usePermissions.ts`
- Create: `apps/dashboard/src/shared/store/authStore.ts`

- [ ] **Step 1: 创建 shared 目录结构**

```bash
mkdir -p apps/dashboard/src/shared/{api,components,hooks,store}
```

- [ ] **Step 2: 移动 api/request.ts**

```bash
mv apps/dashboard/src/api/request.ts apps/dashboard/src/shared/api/request.ts
```

- [ ] **Step 3: 移动 api/auth.ts**

```bash
mv apps/dashboard/src/api/auth.ts apps/dashboard/src/shared/api/auth.ts
```

- [ ] **Step 4: 移动其他 api 文件**

```bash
mv apps/dashboard/src/api/members.ts apps/dashboard/src/shared/api/
mv apps/dashboard/src/api/orders.ts apps/dashboard/src/shared/api/
mv apps/dashboard/src/api/products.ts apps/dashboard/src/shared/api/
mv apps/dashboard/src/api/reports.ts apps/dashboard/src/shared/api/
mv apps/dashboard/src/api/rules.ts apps/dashboard/src/shared/api/
```

- [ ] **Step 5: 移动 components**

```bash
mv apps/dashboard/src/components/ErrorBoundary.tsx apps/dashboard/src/shared/components/
```

- [ ] **Step 6: 移动 hooks**

```bash
mv apps/dashboard/src/hooks/usePermission.ts apps/dashboard/src/shared/hooks/
mv apps/dashboard/src/hooks/usePermissions.ts apps/dashboard/src/shared/hooks/
```

- [ ] **Step 7: 移动 store**

```bash
mv apps/dashboard/src/store/authStore.ts apps/dashboard/src/shared/store/
```

- [ ] **Step 8: 更新 import 路径**

在移动后的文件中，将 `import ... from '@/api/...` 改为 `import ... from '@/shared/api/...`
将 `import ... from '@/store/...` 改为 `import ... from '@/shared/store/...`
将 `import ... from '@/components/...` 改为 `import ... from '@/shared/components/...`
将 `import ... from '@/hooks/...` 改为 `import ... from '@/shared/hooks/...`

- [ ] **Step 9: 提交**

```bash
git add apps/dashboard/src/shared/
git commit -m "refactor(dashboard): move shared code to shared/ directory"
```

---

### Task 2: 创建 enterprise/pages 目录并移动企业页面

**Files:**
- Create: `apps/dashboard/src/enterprise/pages/Dashboard.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Member.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Rules.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Products.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Orders.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Points.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Reports.tsx`
- Create: `apps/dashboard/src/enterprise/pages/Roles.tsx`

- [ ] **Step 1: 创建 enterprise/pages 目录**

```bash
mkdir -p apps/dashboard/src/enterprise/pages
```

- [ ] **Step 2: 移动企业页面文件**

```bash
mv apps/dashboard/src/pages/enterprise/Dashboard.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Member.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Rules.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Products.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Orders.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Points.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Reports.tsx apps/dashboard/src/enterprise/pages/
mv apps/dashboard/src/pages/enterprise/Roles.tsx apps/dashboard/src/enterprise/pages/
```

- [ ] **Step 3: 更新企业页面中的 import 路径**

将 `import ... from '@/pages/...` 改为 `import ... from '@/enterprise/pages/...`
将 `import ... from '@/api/...` 改为 `import ... from '@/shared/api/...`
等等

- [ ] **Step 4: 提交**

```bash
git add apps/dashboard/src/enterprise/
git commit -m "refactor(dashboard): move enterprise pages to enterprise/pages"
```

---

### Task 3: 创建 platform/pages 目录并移动平台页面

**Files:**
- Create: `apps/dashboard/src/platform/pages/PlatformDashboard.tsx`
- Create: `apps/dashboard/src/platform/pages/EnterpriseManagement.tsx`
- Create: `apps/dashboard/src/platform/pages/SystemManagement.tsx`
- Create: `apps/dashboard/src/platform/pages/Config.tsx`

- [ ] **Step 1: 创建 platform/pages 目录**

```bash
mkdir -p apps/dashboard/src/platform/pages
```

- [ ] **Step 2: 移动平台页面文件**

```bash
mv apps/dashboard/src/pages/platform/PlatformDashboard.tsx apps/dashboard/src/platform/pages/
mv apps/dashboard/src/pages/platform/EnterpriseManagement.tsx apps/dashboard/src/platform/pages/
mv apps/dashboard/src/pages/platform/SystemManagement.tsx apps/dashboard/src/platform/pages/
mv apps/dashboard/src/pages/platform/Config.tsx apps/dashboard/src/platform/pages/
```

- [ ] **Step 3: 更新平台页面中的 import 路径**

将 `import ... from '@/pages/...` 改为 `import ... from '@/platform/pages/...`
将 `import ... from '@/api/...` 改为 `import ... from '@/shared/api/...`
等等

- [ ] **Step 4: 提交**

```bash
git add apps/dashboard/src/platform/
git commit -m "refactor(dashboard): move platform pages to platform/pages"
```

---

### Task 4: 创建 EnterpriseApp.tsx

**Files:**
- Create: `apps/dashboard/src/EnterpriseApp.tsx`

- [ ] **Step 1: 创建 EnterpriseApp.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BarChartOutlined,
  SafetyOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import Dashboard from '@/enterprise/pages/Dashboard';
import Member from '@/enterprise/pages/Member';
import Rules from '@/enterprise/pages/Rules';
import Products from '@/enterprise/pages/Products';
import Orders from '@/enterprise/pages/Orders';
import Points from '@/enterprise/pages/Points';
import Reports from '@/enterprise/pages/Reports';
import Roles from '@/enterprise/pages/Roles';
import LoginPage from '@/shared/pages/LoginPage';

import { useAuthStore } from '@/shared/store/authStore';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { routeLogger } from '@carbon-point/utils';

const { Header, Sider, Content } = Layout;

// Enterprise admin permission map
const ENTERPRISE_PERMISSION_MAP: Record<string, string> = {
  '/enterprise/dashboard': 'enterprise:dashboard:view',
  '/enterprise/members': 'enterprise:member:list',
  '/enterprise/rules': 'enterprise:rule:view',
  '/enterprise/products': 'enterprise:product:list',
  '/enterprise/orders': 'enterprise:order:list',
  '/enterprise/points': 'enterprise:point:query',
  '/enterprise/reports': 'enterprise:report:view',
  '/enterprise/roles': 'enterprise:role:list',
};

const EnterpriseMenuItems: MenuProps['items'] = [
  { key: '/enterprise/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/enterprise/members', icon: <TeamOutlined />, label: '员工管理' },
  { key: '/enterprise/rules', icon: <SettingOutlined />, label: '规则配置' },
  { key: '/enterprise/products', icon: <ShopOutlined />, label: '商品管理' },
  { key: '/enterprise/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/enterprise/points', icon: <TrophyOutlined />, label: '积分运营' },
  { key: '/enterprise/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/enterprise/roles', icon: <SafetyOutlined />, label: '角色权限' },
];

const EnterpriseContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    routeLogger.info(`[路由切换] 导航到 ${location.pathname}`);
  }, [location.pathname]);

  const menuItems = EnterpriseMenuItems
    .filter(item => {
      if (permissionsLoading) return true;
      const key = String((item as any).key);
      const perm = ENTERPRISE_PERMISSION_MAP[key];
      return !perm || permissions.includes(perm);
    })
    .map(item => {
      const i = item as any;
      return {
        ...item,
        onClick: () => { if (i?.key) navigate(String(i.key)); },
      };
    });

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'notifications', icon: <BellOutlined />, label: '通知中心' },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => { logout(); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{ background: '#001529' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold',
        }}>
          {collapsed ? '碳' : '碳积分管理后台'}
        </div>
        {isAuthenticated && (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems as any}
            style={{ borderRight: 0 }}
          />
        )}
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar style={{ cursor: 'pointer' }}>{user?.username?.charAt(0) || user?.phone?.charAt(0) || 'U'}</Avatar>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            {!isAuthenticated ? (
              <Route path="/login" element={<LoginPage />} />
            ) : (
              <>
                <Route path="/" element={<Navigate to="/enterprise/dashboard" replace />} />
                <Route path="/enterprise/dashboard" element={<Dashboard />} />
                <Route path="/enterprise/members" element={<Member />} />
                <Route path="/enterprise/rules" element={<Rules />} />
                <Route path="/enterprise/products" element={<Products />} />
                <Route path="/enterprise/orders" element={<Orders />} />
                <Route path="/enterprise/points" element={<Points />} />
                <Route path="/enterprise/reports" element={<Reports />} />
                <Route path="/enterprise/roles" element={<Roles />} />
                <Route path="*" element={<Navigate to="/enterprise/dashboard" replace />} />
              </>
            )}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const EnterpriseApp: React.FC = () => (
  <HashRouter>
    <ErrorBoundary>
      <EnterpriseContent />
    </ErrorBoundary>
  </HashRouter>
);

export default EnterpriseApp;
```

- [ ] **Step 2: 创建共享的 LoginPage**

将 `apps/dashboard/src/pages/LoginPage.tsx` 移动到 `apps/dashboard/src/shared/pages/LoginPage.tsx`

- [ ] **Step 3: 更新 LoginPage 中的 import 路径**

- [ ] **Step 4: 提交**

```bash
git add apps/dashboard/src/EnterpriseApp.tsx
git add apps/dashboard/src/shared/pages/
git commit -m "feat(dashboard): create EnterpriseApp component"
```

---

### Task 5: 创建 PlatformApp.tsx

**Files:**
- Create: `apps/dashboard/src/PlatformApp.tsx`

- [ ] **Step 1: 创建 PlatformApp.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  SafetyOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import PlatformDashboard from '@/platform/pages/PlatformDashboard';
import EnterpriseManagement from '@/platform/pages/EnterpriseManagement';
import SystemManagement from '@/platform/pages/SystemManagement';
import Config from '@/platform/pages/Config';
import LoginPage from '@/shared/pages/PlatformLoginPage';

import { useAuthStore } from '@/shared/store/authStore';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { routeLogger } from '@carbon-point/utils';

const { Header, Sider, Content } = Layout;

// Platform admin role types
const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;
type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

const PLATFORM_PERMISSION_MAP: Record<string, string> = {
  '/platform/dashboard': 'platform:dashboard:view',
  '/platform/enterprises': 'platform:enterprise:list',
  '/platform/system': 'platform:system:view',
  '/platform/config': 'platform:config:view',
};

const PLATFORM_MENU_ROLES: Record<string, PlatformRole[]> = {
  '/platform/dashboard': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/enterprises': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/system': [PLATFORM_ROLES.SUPER_ADMIN],
  '/platform/config': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
};

const PlatformMenuItems: MenuProps['items'] = [
  { key: '/platform/dashboard', icon: <DashboardOutlined />, label: '平台看板' },
  { key: '/platform/enterprises', icon: <TeamOutlined />, label: '企业管理' },
  { key: '/platform/system', icon: <SafetyOutlined />, label: '系统管理' },
  { key: '/platform/config', icon: <SettingOutlined />, label: '平台配置' },
];

const PlatformContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    routeLogger.info(`[路由切换] 导航到 ${location.pathname}`);
  }, [location.pathname]);

  const userRoles = user?.roles ?? [];

  const menuItems = PlatformMenuItems
    .filter(item => {
      if (permissionsLoading) return true;
      const key = String((item as any).key);
      const allowedRoles = PLATFORM_MENU_ROLES[key];
      if (!allowedRoles) return true;
      const hasRole = userRoles.some(role => allowedRoles.includes(role as PlatformRole));
      if (!hasRole) return false;
      const perm = PLATFORM_PERMISSION_MAP[key];
      return !perm || permissions.includes(perm);
    })
    .map(item => {
      const i = item as any;
      return {
        ...item,
        onClick: () => { if (i?.key) navigate(String(i.key)); },
      };
    });

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'notifications', icon: <BellOutlined />, label: '通知中心' },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => { logout(); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{ background: '#001529' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold',
        }}>
          {collapsed ? '碳' : '平台管理后台'}
        </div>
        {isAuthenticated && (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems as any}
            style={{ borderRight: 0 }}
          />
        )}
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar style={{ cursor: 'pointer' }}>{user?.username?.charAt(0) || 'U'}</Avatar>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            {!isAuthenticated ? (
              <Route path="/login" element={<LoginPage />} />
            ) : (
              <>
                <Route path="/" element={<Navigate to="/platform/dashboard" replace />} />
                <Route path="/platform/dashboard" element={<PlatformDashboard />} />
                <Route path="/platform/enterprises" element={<EnterpriseManagement />} />
                <Route path="/platform/system" element={<SystemManagement />} />
                <Route path="/platform/config" element={<Config />} />
                <Route path="*" element={<Navigate to="/platform/dashboard" replace />} />
              </>
            )}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const PlatformApp: React.FC = () => (
  <HashRouter>
    <ErrorBoundary>
      <PlatformContent />
    </ErrorBoundary>
  </HashRouter>
);

export default PlatformApp;
```

- [ ] **Step 2: 创建共享的平台 LoginPage**

将 `apps/dashboard/src/pages/platform/LoginPage.tsx` 移动到 `apps/dashboard/src/shared/pages/PlatformLoginPage.tsx`

- [ ] **Step 3: 更新 PlatformLoginPage 中的 import 路径**

- [ ] **Step 4: 提交**

```bash
git add apps/dashboard/src/PlatformApp.tsx
git commit -m "feat(dashboard): create PlatformApp component"
```

---

### Task 6: 更新入口文件

**Files:**
- Modify: `apps/dashboard/src/main.tsx`
- Modify: `apps/dashboard/src/platform_main.tsx`

- [ ] **Step 1: 更新 main.tsx**

将 `import App from './App';` 改为 `import EnterpriseApp from './EnterpriseApp';`
将 `<App />` 改为 `<EnterpriseApp />`

- [ ] **Step 2: 更新 platform_main.tsx**

将 `import App from './App';` 改为 `import PlatformApp from './PlatformApp';`
将 `<App />` 改为 `<PlatformApp />`

- [ ] **Step 3: 删除旧的 App.tsx**

```bash
rm apps/dashboard/src/App.tsx
```

- [ ] **Step 4: 提交**

```bash
git add apps/dashboard/src/main.tsx apps/dashboard/src/platform_main.tsx
git rm apps/dashboard/src/App.tsx
git commit -m "refactor(dashboard): use separate App components for each admin"
```

---

### Task 7: 更新 vite.config.ts alias

**Files:**
- Modify: `apps/dashboard/vite.config.ts`

- [ ] **Step 1: 更新 alias 配置**

在 `resolve.alias` 中添加：

```typescript
'@/enterprise/pages': path.resolve(__dirname, './src/enterprise/pages'),
'@/platform/pages': path.resolve(__dirname, './src/platform/pages'),
'@/shared': path.resolve(__dirname, './src/shared'),
```

- [ ] **Step 2: 提交**

```bash
git add apps/dashboard/vite.config.ts
git commit -m "chore(dashboard): update vite alias for new directory structure"
```

---

### Task 8: 清理空目录和冗余文件

**Files:**
- Delete: `apps/dashboard/src/pages/` (空目录)
- Delete: `apps/dashboard/src/api/` (空目录)
- Delete: `apps/dashboard/src/store/` (空目录)
- Delete: `apps/dashboard/src/hooks/` (空目录)
- Delete: `apps/dashboard/src/components/` (空目录)

- [ ] **Step 1: 删除空目录**

```bash
rmdir apps/dashboard/src/pages apps/dashboard/src/api apps/dashboard/src/store apps/dashboard/src/hooks apps/dashboard/src/components 2>/dev/null || true
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "chore(dashboard): clean up empty directories"
```

---

### Task 9: 验证构建

- [ ] **Step 1: 安装依赖**

```bash
cd apps/dashboard && pnpm install
```

- [ ] **Step 2: 启动开发服务器**

```bash
pnpm dev
```

- [ ] **Step 3: 验证企业后台入口**

访问 `http://localhost:3001/` 或 `http://localhost:3002/`
确认显示"碳积分管理后台"，菜单正常显示

- [ ] **Step 4: 验证平台后台入口**

访问 `http://localhost:3001/platform.html`
确认显示"平台管理后台"，菜单正常显示

- [ ] **Step 5: 测试登录流程**

1. 在企业后台登录，确认菜单正确显示
2. 在平台后台登录（通过 `/platform.html`），确认菜单正确显示

---

## 总结

完成上述任务后，`apps/dashboard` 将变为：

```
apps/dashboard/src/
├── main.tsx                    # 企业后台入口
├── platform_main.tsx           # 平台后台入口
├── EnterpriseApp.tsx          # 企业 App
├── PlatformApp.tsx            # 平台 App
├── enterprise/
│   └── pages/                 # 企业页面
├── platform/
│   └── pages/                 # 平台页面
└── shared/
    ├── api/                   # API 请求
    ├── components/            # 共享组件
    ├── hooks/                 # 共享 hooks
    ├── pages/                 # 共享页面（Login）
    └── store/                 # 状态管理
```

两个系统完全独立，共享代码仅通过 `shared/` 目录共享。
