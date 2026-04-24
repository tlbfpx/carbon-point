import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, ConfigProvider, Input, Badge } from 'antd';
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
  AppstoreOutlined,
  ShopOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { designSystemConfig } from '@carbon-point/design-system';

import PlatformDashboard from '@/pages/PlatformDashboard';
import EnterpriseManagement from '@/pages/EnterpriseManagement';
import SystemManagement from '@/pages/SystemManagement';
import PlatformConfig from '@/pages/PlatformConfig';
import PackageManagement from '@/pages/PackageManagement';
import ProductManagement from '@/pages/ProductManagement';
import BlockLibrary from '@/pages/BlockLibrary';
import SystemUsers from '@/pages/SystemUsers';
import SystemRoles from '@/pages/SystemRoles';
import OperationLogs from '@/pages/OperationLogs';
import DictManagement from '@/pages/DictManagement';
import PlatformLoginPage from '@/pages/PlatformLoginPage';

import { useAuthStore } from '@/store/authStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { routeLogger } from '@/utils';

const { Header, Sider, Content } = Layout;

// Platform admin role types
const PLATFORM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;
type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

const PLATFORM_PERMISSION_MAP: Record<string, string> = {
  '/dashboard': 'platform:dashboard:view',
  '/enterprises': 'platform:enterprise:list',
  '/system': 'platform:system:view',
  '/system/users': 'platform:system:user:list',
  '/system/roles': 'platform:system:role:list',
  '/system/logs': 'platform:system:log:query',
  '/system/dict': 'platform:system:dict:view',
  '/features/products': 'platform:product:list',
  '/features/blocks': 'platform:block:list',
  '/packages': 'platform:package:list',
  '/config': 'platform:config:view',
};

const PLATFORM_MENU_ROLES: Record<string, PlatformRole[]> = {
  '/dashboard': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/enterprises': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/system': [PLATFORM_ROLES.SUPER_ADMIN],
  '/system/users': [PLATFORM_ROLES.SUPER_ADMIN],
  '/system/roles': [PLATFORM_ROLES.SUPER_ADMIN],
  '/system/logs': [PLATFORM_ROLES.SUPER_ADMIN],
  '/system/dict': [PLATFORM_ROLES.SUPER_ADMIN],
  '/features': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN],
  '/features/products': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN],
  '/features/blocks': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN],
  '/packages': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/config': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
};

const PlatformMenuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '平台看板' },
  { key: '/enterprises', icon: <TeamOutlined />, label: '企业管理' },
  {
    key: '/system',
    icon: <SafetyOutlined />,
    label: '系统管理',
    children: [
      { key: '/system/users', label: '用户管理' },
      { key: '/system/roles', label: '角色管理' },
      { key: '/system/logs', label: '操作日志' },
      { key: '/system/dict', label: '字典管理' },
    ],
  },
  {
    key: '/features',
    icon: <AppstoreOutlined />,
    label: '功能配置',
    children: [
      { key: '/features/products', label: '产品管理' },
      { key: '/features/blocks', label: '积木组件库' },
    ],
  },
  { type: 'divider' },
  { key: '/packages', icon: <ShopOutlined />, label: '套餐管理' },
  { key: '/config', icon: <SettingOutlined />, label: '平台配置' },
];

const PlatformContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['/system', '/features']);

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
        theme="light"
        width={220}
        collapsedWidth={72}
        style={{
          background: '#F8F9FC',
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366F1',
          fontSize: collapsed ? 18 : 18,
          fontWeight: 700,
          fontFamily: "'Inter', 'Noto Sans SC', sans-serif",
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}>
          {collapsed ? '碳' : '平台管理后台'}
        </div>
        {isAuthenticated && (
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems as any}
            onClick={({ key }) => navigate(key)}
            style={{
              borderRight: 0,
              background: 'transparent',
              padding: '8px 0',
            }}
          />
        )}
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#475569' }}
            />
            <Input
              placeholder="搜索企业、用户、订单..."
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              style={{
                width: 280,
                borderRadius: 8,
                background: '#F5F5F7',
                border: '1px solid transparent',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: '#94A3B8' }} />
            <Badge count={0} showZero={false} size="small">
              <Button type="text" icon={<BellOutlined />} style={{ color: '#94A3B8' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {user?.username?.charAt(0) || 'U'}
                </Avatar>
                {!collapsed && (
                  <span style={{ fontSize: 14, color: '#475569' }}>
                    {user?.username || '用户'}
                  </span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{
          margin: 24,
          minHeight: 280,
        }}>
           <Routes>
              {!isAuthenticated ? (
                <>
                  <Route path="/login" element={<PlatformLoginPage />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<PlatformDashboard />} />
                  <Route path="/enterprises" element={<EnterpriseManagement />} />
                  <Route path="/system" element={<SystemManagement />} />
                  <Route path="/system/users" element={<SystemUsers />} />
                  <Route path="/system/roles" element={<SystemRoles />} />
                  <Route path="/system/logs" element={<OperationLogs />} />
                  <Route path="/system/dict" element={<DictManagement />} />
                  <Route path="/config" element={<PlatformConfig />} />
                  <Route path="/features/products" element={<ProductManagement />} />
                  <Route path="/features/blocks" element={<BlockLibrary />} />
                  <Route path="/packages" element={<PackageManagement />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => (
  <BrowserRouter
    basename="/platform"
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <ConfigProvider {...designSystemConfig.light}>
      <ErrorBoundary>
        <PlatformContent />
      </ErrorBoundary>
    </ConfigProvider>
  </BrowserRouter>
);

export default App;
