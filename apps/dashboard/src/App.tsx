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
import EnterpriseDashboard from '@/pages/enterprise/Dashboard';
import EnterpriseMember from '@/pages/enterprise/Member';
import EnterpriseRules from '@/pages/enterprise/Rules';
import EnterpriseProducts from '@/pages/enterprise/Products';
import EnterpriseOrders from '@/pages/enterprise/Orders';
import EnterprisePoints from '@/pages/enterprise/Points';
import EnterpriseReports from '@/pages/enterprise/Reports';
import EnterpriseRoles from '@/pages/enterprise/Roles';
import PlatformDashboard from '@/pages/platform/PlatformDashboard';
import EnterpriseManagement from '@/pages/platform/EnterpriseManagement';
import SystemManagement from '@/pages/platform/SystemManagement';
import Config from '@/pages/platform/Config';
import LoginPage from '@/pages/LoginPage';
import PlatformLoginPage from '@/pages/platform/LoginPage';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content } = Layout;

// Platform admin role types (from backend spec)
const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;
type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

// Platform admin permission codes (from backend spec: platform:module:operation)
const PLATFORM_PERMISSION_MAP: Record<string, string> = {
  '/platform/dashboard': 'platform:report:view',
  '/platform/enterprises': 'platform:tenant:view',
  '/platform/system': 'platform:admin:view',
  '/platform/config': 'platform:config:view',
};

// Platform menus by role (from backend spec permission matrix):
// - super_admin: all menus (all permissions)
// - admin: platform dashboard, enterprise management, config view; no system management
// - viewer: platform dashboard, enterprise view only; no system management, no config write
const PLATFORM_MENU_ROLES: Record<string, PlatformRole[]> = {
  '/platform/dashboard': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/enterprises': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/system': [PLATFORM_ROLES.SUPER_ADMIN],
  '/platform/config': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
};

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

const PlatformMenuItems: MenuProps['items'] = [
  { key: '/platform/dashboard', icon: <DashboardOutlined />, label: '平台看板' },
  { key: '/platform/enterprises', icon: <TeamOutlined />, label: '企业管理' },
  { key: '/platform/system', icon: <SafetyOutlined />, label: '系统管理' },
  { key: '/platform/config', icon: <SettingOutlined />, label: '平台配置' },
];

const AppContent: React.FC<{ isPlatformApp: boolean }> = ({ isPlatformApp }) => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  const userRoles = user?.roles ?? [];

  const menuItems = (isPlatformApp ? PlatformMenuItems : EnterpriseMenuItems)
    .filter(item => {
      // While permissions are loading, show all menus to avoid flickering
      if (permissionsLoading) return true;

      const key = String((item as any).key);

      if (isPlatformApp) {
        // Platform admin: first check role, then check permission code
        const allowedRoles = PLATFORM_MENU_ROLES[key];
        if (!allowedRoles) return true;

        // Check if user has one of the allowed roles
        const hasRole = userRoles.some(role => allowedRoles.includes(role as PlatformRole));
        if (!hasRole) return false;

        // Also verify the user has the required permission code
        const perm = PLATFORM_PERMISSION_MAP[key];
        return !perm || permissions.includes(perm);
      } else {
        // Enterprise admin: check permission code
        const perm = ENTERPRISE_PERMISSION_MAP[key];
        return !perm || permissions.includes(perm);
      }
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

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={isPlatformApp ? <PlatformLoginPage /> : <LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

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
          {collapsed ? '碳' : (isPlatformApp ? '平台管理后台' : '碳积分管理后台')}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          // @ts-ignore
          items={menuItems as any}
          style={{ borderRight: 0 }}
        />
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
            {isPlatformApp ? (
              <>
                <Route path="/platform/dashboard" element={<PlatformDashboard />} />
                <Route path="/platform/enterprises" element={<EnterpriseManagement />} />
                <Route path="/platform/system" element={<SystemManagement />} />
                <Route path="/platform/config" element={<Config />} />
                <Route path="/" element={<Navigate to="/platform/dashboard" replace />} />
              </>
            ) : (
              <>
                <Route path="/enterprise/dashboard" element={<EnterpriseDashboard />} />
                <Route path="/enterprise/members" element={<EnterpriseMember />} />
                <Route path="/enterprise/rules" element={<EnterpriseRules />} />
                <Route path="/enterprise/products" element={<EnterpriseProducts />} />
                <Route path="/enterprise/orders" element={<EnterpriseOrders />} />
                <Route path="/enterprise/points" element={<EnterprisePoints />} />
                <Route path="/enterprise/reports" element={<EnterpriseReports />} />
                <Route path="/enterprise/roles" element={<EnterpriseRoles />} />
                <Route path="/" element={<Navigate to="/enterprise/dashboard" replace />} />
              </>
            )}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC<{ isPlatformApp?: boolean }> = ({ isPlatformApp = false }) => (
  <HashRouter>
    <AppContent isPlatformApp={isPlatformApp} />
  </HashRouter>
);

export default App;
