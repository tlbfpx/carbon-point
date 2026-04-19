import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Image, ConfigProvider } from 'antd';
import { designSystemConfig } from '@carbon-point/design-system';
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
    AppstoreOutlined,
    BookOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
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
import FeatureMatrix from '@/pages/FeatureMatrix';
import DictManagement from '@/pages/DictManagement';
import LoginPage from '@/pages/LoginPage';
import OperationLog from '@/pages/OperationLog';

import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { routeLogger } from '@/utils';

const { Header, Sider, Content } = Layout;

// Enterprise admin permission map — branding does not require a specific permission
const ENTERPRISE_PERMISSION_MAP: Record<string, string | undefined> = {
  '/dashboard': 'enterprise:dashboard:view',
  '/members': 'enterprise:member:list',
  '/rules': 'enterprise:rule:view',
  '/products': 'enterprise:product:list',
  '/orders': 'enterprise:order:list',
  '/points': 'enterprise:point:query',
  '/reports': 'enterprise:report:view',
  '/roles': 'enterprise:role:list',
  '/feature-matrix': 'enterprise:feature:view',
  '/dict-management': 'enterprise:dict:view',
  '/branding': undefined,
  '/operation-log': 'enterprise:log:query',
};

const EnterpriseMenuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/members', icon: <TeamOutlined />, label: '员工管理' },
  { key: '/rules', icon: <SettingOutlined />, label: '规则配置' },
  { key: '/products', icon: <ShopOutlined />, label: '产品管理' },
  { key: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/points', icon: <TrophyOutlined />, label: '积分运营' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/roles', icon: <SafetyOutlined />, label: '角色管理' },
  { key: '/feature-matrix', icon: <AppstoreOutlined />, label: '功能点阵' },
  { key: '/dict-management', icon: <BookOutlined />, label: '字典管理' },
  { key: '/branding', icon: <SkinOutlined />, label: '品牌配置' },
  { key: '/operation-log', icon: <FileTextOutlined />, label: '操作日志' },
];

// Dark gradient sidebar colors
const SIDER_GRADIENT = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)';
const PAGE_GRADIENT = 'linear-gradient(135deg, #f8f7f4 0%, #f0efe9 100%)';
const MENU_ITEM_DEFAULT_COLOR = '#a0aec0';
const MENU_ITEM_ACTIVE_BG = 'rgba(255, 255, 255, 0.08)';

const EnterpriseContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { branding, primaryColor } = useBranding();

  // Debug logging
  console.log('[EnterpriseContent render] isAuthenticated:', isAuthenticated, 'user:', !!user, 'location:', location.pathname);

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

  // Custom menu item renderer for pill-shaped items with glow effects
  const customMenuItems: MenuProps['items'] = menuItems.map((item: any) => ({
    ...item,
    label: (
      <span className="custom-menu-label">
        {item.label}
      </span>
    ),
  }));

  // Not authenticated → standalone full-page login (no sidebar/header)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: PAGE_GRADIENT, fontFamily: 'var(--font-body)' }}>
      {/* Sidebar with dark gradient */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: SIDER_GRADIENT,
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        theme="dark"
      >
        {/* Logo Area */}
        <div style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          margin: '16px 12px',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
        }}>
          {collapsed ? (
            branding?.logoUrl ? (
              <Image src={branding.logoUrl} alt="Logo" width={36} height={36} preview={false} style={{ borderRadius: 8 }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: primaryColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: '#fff',
                boxShadow: `0 4px 12px ${primaryColor}40`,
              }}>
                碳
              </div>
            )
          ) : (
            <>
              {branding?.logoUrl ? (
                <Image src={branding.logoUrl} alt="Logo" width={36} height={36} preview={false} style={{ borderRadius: 8 }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: primaryColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: '#fff',
                  boxShadow: `0 4px 12px ${primaryColor}40`,
                  marginRight: 12,
                }}>
                  碳
                </div>
              )}
              <span style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.5px',
              }}>
                碳积分
              </span>
            </>
          )}
        </div>

        {/* Menu with dark theme */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={customMenuItems}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
          }}
        />

        {/* Collapse Button */}
        <div style={{
          padding: '16px 12px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: MENU_ITEM_DEFAULT_COLOR,
              width: '100%',
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>

        {/* Brand color accent strip at bottom */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
          margin: '0 12px 16px',
          borderRadius: 2,
        }} />
      </Sider>

      {/* Main Content Area */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s', minHeight: '100vh' }}>
        {/* Clean header */}
        <Header style={{
          padding: '0 32px',
          height: 56,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderBottom: `1px solid var(--color-border)`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Notification Bell */}
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{
                color: '#6b7280',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
                width: 36,
                height: 36,
              }}
            />

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '4px 8px 4px 4px',
                borderRadius: 10,
                transition: 'background 0.2s',
              }}>
                <Avatar
                  size={32}
                  style={{
                    background: primaryColor,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {user?.username?.charAt(0) || user?.phone?.charAt(0) || 'U'}
                </Avatar>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.2,
                  }}>
                    {user?.username || user?.phone || '用户'}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.2,
                  }}>
                    {branding?.tenantName || '企业管理员'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content with warm gradient */}
        <Content style={{
          padding: '24px 28px',
          minHeight: 'calc(100vh - 56px)',
          background: PAGE_GRADIENT,
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Member />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/points" element={<Points />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/feature-matrix" element={<FeatureMatrix />} />
            <Route path="/dict-management" element={<DictManagement />} />
            <Route path="/branding" element={<Branding />} />
            <Route path="/operation-log" element={<OperationLog />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => (
  <ConfigProvider {...designSystemConfig.dark}>
    <BrowserRouter basename="/enterprise">
      <ErrorBoundary>
        <EnterpriseContent />
      </ErrorBoundary>
    </BrowserRouter>
  </ConfigProvider>
);

export default App;
