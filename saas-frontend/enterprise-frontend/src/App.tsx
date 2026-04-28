import React, { useState, useEffect, useMemo } from 'react';
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
    AppstoreOutlined,
    BookOutlined,
    FileTextOutlined,
    WomanOutlined,
    SwapOutlined,
    SmileOutlined,
    ClockCircleOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import Dashboard from '@/pages/Dashboard';
import Member from '@/pages/Member';
import Points from '@/pages/Points';
import Reports from '@/pages/Reports';
import Roles from '@/pages/Roles';
import Branding from '@/pages/Branding';
import FeatureMatrix from '@/pages/FeatureMatrix';
import DictManagement from '@/pages/DictManagement';
import LoginPage from '@/pages/LoginPage';
import OperationLog from '@/pages/OperationLog';
import PointExpiration from '@/pages/PointExpiration';

// New product pages
import StairClimbingPage from '@/pages/product/StairClimbingPage';
import WalkingPage from '@/pages/product/WalkingPage';
import QuizPage from '@/pages/product/QuizPage';
import MallPage from '@/pages/product/MallPage';
import SettingsPage from '@/pages/SettingsPage';

import { useFeatureStore } from '@/store/featureStore';

import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import PermissionGuard from '@/components/PermissionGuard';
import { routeLogger } from '@/utils';
import { getTenantProducts } from '@/api/tenantProducts';
import { getTenantMenu, MenuItem as ApiMenuItem } from '@/api/menu';
import { getIconComponent } from '@/utils/iconMapper';
import { useQuery } from '@tanstack/react-query';

const { Header, Sider, Content } = Layout;

// Phase 2 fallback: when dynamic menu API is unavailable, this map gates static menu items by permission.
// See enterprise-package-menu-design.md §7 — Phase 3 removes this entirely once platform-backend can fully drive menus.
const ENTERPRISE_PERMISSION_MAP: Record<string, string | undefined> = {
  '/dashboard': 'enterprise:dashboard:view',
  '/members': 'enterprise:member:list',
  // Product pages
  '/product/stair-climbing': 'enterprise:rule:view',
  '/product/walking': 'enterprise:walking:view',
  '/product/quiz': 'enterprise:quiz:view',
  '/product/mall': 'enterprise:product:list',
  '/settings': undefined,
  // Operations
  '/points': 'enterprise:point:query',
  '/point-expiration': 'enterprise:point:query',
  '/reports': 'enterprise:report:view',
  // Settings sub-pages
  '/roles': 'enterprise:role:list',
  '/branding': undefined,
  '/feature-matrix': 'enterprise:feature:view',
  '/dict-management': 'enterprise:dict:view',
  '/operation-log': 'enterprise:log:query',
  // Legacy redirects (keep for compatibility)
  '/rules': 'enterprise:rule:view',
  '/walking': 'enterprise:walking:view',
  '/walking/step-config': 'enterprise:walking:config',
  '/walking/fun-equiv': 'enterprise:walking:config',
  '/quiz': 'enterprise:quiz:view',
  '/products': 'enterprise:product:list',
  '/orders': 'enterprise:order:list',
  '/mall/shelf': 'enterprise:mall:shelf',
  '/mall/reports': 'enterprise:mall:report',
  '/product-config': 'enterprise:product:config',
};

// Phase 2 fallback: static menu rendered when getTenantMenu() returns empty.
// Aligns with enterprise-package-menu-design.md §7 migration strategy. Remove in Phase 3.
const EnterpriseMenuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据看板' },
  { key: '/members', icon: <TeamOutlined />, label: '员工管理' },
  // Product menus — filtered dynamically below based on purchased products
  { key: '/product/stair-climbing', icon: <RiseOutlined />, label: '爬楼积分管理' },
  { key: '/product/walking', icon: <WomanOutlined />, label: '走路积分管理' },
  { key: '/product/quiz', icon: <BookOutlined />, label: '答题管理' },
  { key: '/product/mall', icon: <ShopOutlined />, label: '积分商城' },
  // Operations
  { key: '/points', icon: <TrophyOutlined />, label: '积分运营' },
  { key: '/point-expiration', icon: <ClockCircleOutlined />, label: '积分过期配置' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  // Settings
  {
    key: 'settings-group',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/roles', label: '角色管理' },
      { key: '/branding', label: '品牌配置' },
      { key: '/feature-matrix', label: '功能点阵' },
      { key: '/dict-management', label: '字典管理' },
      { key: '/operation-log', label: '操作日志' },
    ],
  },
];

// Map backend paths to frontend routes
const mapBackendPathToFrontend = (backendPath: string): string => {
  const pathMap: Record<string, string> = {
    '/dashboard': '/dashboard',
    '/mall': '/product/mall',
    '/users': '/members',
    '/reports': '/reports',
    '/settings': '/settings',
  };

  // Check for product paths
  if (backendPath.startsWith('/product/')) {
    const parts = backendPath.split('/');
    const productCode = parts[2];

    const codeToRoute: Record<string, string> = {
      'stair_climbing': '/product/stair-climbing',
      'stairs_climbing': '/product/stair-climbing',
      'walking': '/product/walking',
      'quiz': '/product/quiz',
      'mall': '/product/mall',
    };

    if (codeToRoute[productCode]) {
      return codeToRoute[productCode];
    }
  }

  // If direct match, return it
  if (pathMap[backendPath]) {
    return pathMap[backendPath];
  }

  // Check if path exists in permission map
  if (ENTERPRISE_PERMISSION_MAP[backendPath] !== undefined) {
    return backendPath;
  }

  // Default fallback
  console.log('[Menu] Unknown path, falling back to dashboard:', backendPath);
  return '/dashboard';
};

// Dark gradient sidebar colors
const SIDER_GRADIENT = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)';
const PAGE_GRADIENT = 'linear-gradient(135deg, #f8f7f4 0%, #f0efe9 100%)';
const MENU_ITEM_DEFAULT_COLOR = '#a0aec0';
const MENU_ITEM_ACTIVE_BG = 'rgba(255, 255, 255, 0.08)';

const EnterpriseContent: React.FC = () => {
  const { user, isAuthenticated, logout, permissions, permissionsLoading, isHydrated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { branding, primaryColor } = useBranding();

  // Fetch tenant products to determine which menus to show
  const { data: tenantProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch dynamic menu based on tenant's package
  const { data: dynamicMenu, isLoading: menuLoading } = useQuery({
    queryKey: ['tenant-menu'],
    queryFn: getTenantMenu,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Product code to menu route mapping for static fallback filtering
  const PRODUCT_MENU_MAP: Record<string, string> = {
    'stair_climbing': '/product/stair-climbing',
    'stairs_climbing': '/product/stair-climbing',
    'walking': '/product/walking',
    'quiz': '/product/quiz',
    'mall': '/product/mall',
  };

  const tenantProductKeys = useMemo(() => {
    if (!tenantProducts) return new Set<string>();
    return new Set(
      tenantProducts
        .map(p => PRODUCT_MENU_MAP[p.productCode] || PRODUCT_MENU_MAP[p.category])
        .filter(Boolean)
    );
  }, [tenantProducts]);

  // Debug logging
  console.log('[EnterpriseContent render] isAuthenticated:', isAuthenticated, 'user:', !!user, 'location:', location.pathname, 'tenantProductKeys:', tenantProductKeys, 'dynamicMenu:', dynamicMenu);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    routeLogger.info(`[路由切换] 导航到 ${location.pathname}`);
  }, [location.pathname]);

  // Convert API menu items to Ant Design Menu items with path mapping
  const convertToMenuItems = (items: ApiMenuItem[]): MenuProps['items'] => {
    if (!items || !Array.isArray(items)) return [];

    return items.map(item => {
      const frontendPath = mapBackendPathToFrontend(item.path || item.key);

      return {
        key: frontendPath,
        icon: getIconComponent(item.icon),
        label: item.label,
        disabled: item.disabled || false,
        children: item.children && item.children.length > 0 ? convertToMenuItems(item.children) : undefined,
        onClick: () => {
          if (frontendPath && (!item.children || item.children.length === 0)) {
            navigate(frontendPath);
          }
        },
      };
    });
  };

  // Use dynamic menu if available, otherwise fallback to static
  const menuItems = useMemo(() => {
    if (dynamicMenu && Array.isArray(dynamicMenu) && dynamicMenu.length > 0) {
      console.log('[Menu] Using dynamic menu');
      return convertToMenuItems(dynamicMenu);
    }

    // Fallback to static menu
    console.log('[Menu] Using static menu fallback');
    return EnterpriseMenuItems
      .filter(item => {
        const key = String((item as any).key);

        // Hide product menus if tenant hasn't purchased the product
        if (key.startsWith('/product/') && !tenantProductKeys.has(key)) {
          return false;
        }

        // Check permissions for leaf items
        if (permissionsLoading || productsLoading) return true;
        const perm = ENTERPRISE_PERMISSION_MAP[key];
        return !perm || permissions.includes(perm);
      })
      .map(item => {
        const i = item as any;
        if (i.children) {
          return {
            ...item,
            children: i.children.map((child: any) => ({
              ...child,
              onClick: () => { if (child.key) navigate(String(child.key)); },
            })),
          };
        }
        return {
          ...item,
          onClick: () => { if (i?.key) navigate(String(i.key)); },
        };
      });
  }, [dynamicMenu, tenantProductKeys, permissionsLoading, productsLoading, permissions, navigate]);

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
  const customMenuItems: MenuProps['items'] = (menuItems || []).map((item: any) => ({
    ...item,
    label: (
      <span className="custom-menu-label">
        {item?.label || ''}
      </span>
    ),
  }));

  // 还在hydrating → 显示加载状态
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#1a1a2e',
      }}>
        <div style={{ color: '#fff', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

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
          defaultOpenKeys={dynamicMenu ? [] : ['settings-group']}
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
            <Route path="/dashboard" element={<PermissionGuard><Dashboard /></PermissionGuard>} />
            <Route path="/members" element={<PermissionGuard><Member /></PermissionGuard>} />

            {/* New product pages */}
            <Route path="/product/stair-climbing" element={<PermissionGuard><StairClimbingPage /></PermissionGuard>} />
            <Route path="/product/walking" element={<PermissionGuard><WalkingPage /></PermissionGuard>} />
            <Route path="/product/quiz" element={<PermissionGuard><QuizPage /></PermissionGuard>} />
            <Route path="/product/mall" element={<PermissionGuard><MallPage /></PermissionGuard>} />
            <Route path="/settings" element={<PermissionGuard><SettingsPage /></PermissionGuard>} />

            {/* Operations */}
            <Route path="/points" element={<PermissionGuard><Points /></PermissionGuard>} />
            <Route path="/point-expiration" element={<PermissionGuard><PointExpiration /></PermissionGuard>} />
            <Route path="/reports" element={<PermissionGuard><Reports /></PermissionGuard>} />

            {/* Settings sub-pages */}
            <Route path="/roles" element={<PermissionGuard><Roles /></PermissionGuard>} />
            <Route path="/branding" element={<PermissionGuard><Branding /></PermissionGuard>} />
            <Route path="/feature-matrix" element={<PermissionGuard><FeatureMatrix /></PermissionGuard>} />
            <Route path="/dict-management" element={<PermissionGuard><DictManagement /></PermissionGuard>} />
            <Route path="/operation-log" element={<PermissionGuard><OperationLog /></PermissionGuard>} />

            {/* Old route redirects */}
            <Route path="/rules" element={<Navigate to="/product/stair-climbing" replace />} />
            <Route path="/walking" element={<Navigate to="/product/walking" replace />} />
            <Route path="/walking/step-config" element={<Navigate to="/product/walking" replace />} />
            <Route path="/walking/fun-equiv" element={<Navigate to="/product/walking" replace />} />
            <Route path="/quiz" element={<Navigate to="/product/quiz" replace />} />
            <Route path="/products" element={<Navigate to="/product/mall" replace />} />
            <Route path="/orders" element={<Navigate to="/product/mall" replace />} />
            <Route path="/mall/shelf" element={<Navigate to="/product/mall" replace />} />
            <Route path="/mall/reports" element={<Navigate to="/product/mall" replace />} />
            <Route path="/product-config" element={<Navigate to="/product/stair-climbing" replace />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => (
  <BrowserRouter
    basename="/enterprise"
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <ErrorBoundary>
      <EnterpriseContent />
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
