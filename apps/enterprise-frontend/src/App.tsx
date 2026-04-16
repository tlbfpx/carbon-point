import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Image } from 'antd';
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
    SkinOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getCurrentBranding, TenantBranding } from '@/api/branding';
import type { MenuProps } from 'antd';

import Dashboard from '@/pages/Dashboard';
import Member from '@/pages/Member';
import Rules from '@/pages/Rules';
import Products from '@/pages/Products';
import Orders from '@/pages/Orders';
import Points from '@/pages/Points';
import Reports from '@/pages/Reports';
import Roles from '@/pages/Roles';
import Branding from '@/pages/Branding';
import LoginPage from '@/pages/LoginPage';

import { useAuthStore } from '@/store/authStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import { routeLogger } from '@/utils';

const { Header, Sider, Content } = Layout;

// Enterprise admin permission map
const ENTERPRISE_PERMISSION_MAP: Record<string, string> = {
  '/dashboard': 'enterprise:dashboard:view',
  '/members': 'enterprise:member:list',
  '/rules': 'enterprise:rule:view',
  '/products': 'enterprise:product:list',
  '/orders': 'enterprise:order:list',
  '/points': 'enterprise:point:query',
  '/reports': 'enterprise:report:view',
  '/roles': 'enterprise:role:list',
  '/branding': 'enterprise:branding:manage',
};

const EnterpriseMenuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/members', icon: <TeamOutlined />, label: '员工管理' },
  { key: '/rules', icon: <SettingOutlined />, label: '规则配置' },
  { key: '/products', icon: <ShopOutlined />, label: '商品管理' },
  { key: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/points', icon: <TrophyOutlined />, label: '积分运营' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/roles', icon: <SafetyOutlined />, label: '角色权限' },
  { key: '/branding', icon: <SkinOutlined />, label: '品牌配置' },
];

const EnterpriseContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Fetch enterprise branding configuration
  const { data: branding } = useQuery<TenantBranding>({
    queryKey: ['tenantBranding'],
    queryFn: getCurrentBranding,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    routeLogger.info(`[路由切换] 导航到 ${location.pathname}`);
    console.log('[EnterpriseApp Debug]', {
      isAuthenticated,
      permissionsLoading,
      permissions,
      pathname: location.pathname,
    });
  }, [location.pathname, isAuthenticated, permissions, permissionsLoading]);

  const menuItems = EnterpriseMenuItems
    .filter(item => {
      if (permissionsLoading) return true;
      const key = String((item as any).key);
      const perm = ENTERPRISE_PERMISSION_MAP[key];
      const hasPermission = !perm || permissions.includes(perm);
      console.log(`[Menu Filter] key=${key}, perm=${perm}, hasPermission=${hasPermission}`);
      return hasPermission;
    })
    .map(item => {
      const i = item as any;
      return {
        ...item,
        onClick: () => { if (i?.key) navigate(String(i.key)); },
      };
    });

  console.log('[EnterpriseApp Debug] Final menuItems:', menuItems);

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
          gap: 8,
          padding: '0 8px',
        }}>
          {collapsed ? (
            <>{branding?.logoUrl ? (
              <Image src={branding.logoUrl} alt="Logo" width={32} height={32} preview={false} />
            ) : '管'}</>
          ) : (
            <>
              {branding?.logoUrl && (
                <Image src={branding.logoUrl} alt="企业Logo" width={32} height={32} preview={false} />
              )}
              <span>管理后台</span>
            </>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={isAuthenticated ? (menuItems as any) : []}
          style={{ borderRight: 0 }}
        />
        {!isAuthenticated && (
          <div style={{ padding: 16, color: '#fff', textAlign: 'center', fontSize: 12 }}>
            请先登录以访问菜单
          </div>
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
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/members" element={<Member />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/points" element={<Points />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/branding" element={<Branding />} />
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
  <BrowserRouter>
    <ErrorBoundary>
      <EnterpriseContent />
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
