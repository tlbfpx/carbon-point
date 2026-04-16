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
import PlatformConfig from '@/platform/pages/PlatformConfig';
import PackageManagement from '@/platform/pages/PackageManagement';
import PlatformLoginPage from '@/shared/pages/PlatformLoginPage';

import { useAuthStore } from '@/shared/store/authStore';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
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
  '/platform/packages': 'platform:package:view',
};

const PLATFORM_MENU_ROLES: Record<string, PlatformRole[]> = {
  '/platform/dashboard': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/enterprises': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/system': [PLATFORM_ROLES.SUPER_ADMIN],
  '/platform/config': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.VIEWER],
  '/platform/packages': [PLATFORM_ROLES.SUPER_ADMIN, PLATFORM_ROLES.ADMIN],
};

const PlatformMenuItems: MenuProps['items'] = [
  { key: '/platform/dashboard', icon: <DashboardOutlined />, label: '平台看板' },
  { key: '/platform/enterprises', icon: <TeamOutlined />, label: '企业管理' },
  { key: '/platform/system', icon: <SafetyOutlined />, label: '系统管理' },
  { key: '/platform/config', icon: <SettingOutlined />, label: '平台配置' },
  { key: '/platform/packages', icon: <SettingOutlined />, label: '套餐管理' },
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
               <>
                 <Route path="/login" element={<PlatformLoginPage />} />
                 <Route path="*" element={<Navigate to="/login" replace />} />
               </>
             ) : (
               <>
                 <Route path="/" element={<Navigate to="/platform/dashboard" replace />} />
                 <Route path="/platform/dashboard" element={<PlatformDashboard />} />
                 <Route path="/platform/enterprises" element={<EnterpriseManagement />} />
                 <Route path="/platform/system" element={<SystemManagement />} />
                 <Route path="/platform/config" element={<PlatformConfig />} />
                 <Route path="/platform/packages" element={<PackageManagement />} />
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
