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
import ErrorBoundary from '@/shared/components/ErrorBoundary';
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
    // Debug log for menu display issue
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
        }}>
          {collapsed ? '碳' : '碳积分管理后台'}
        </div>
        {/* Always show Menu container, even if not authenticated */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={isAuthenticated ? (menuItems as any) : []}
          style={{ borderRight: 0 }}
        />
        {/* Show login prompt if not authenticated */}
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
