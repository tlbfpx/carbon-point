/**
 * Carbon Point Design System - EnterpriseLayout
 * 企业级布局系统 - 2026 前沿液态玻璃风格
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, ConfigProvider, theme, Flex } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FundProjectionScreenOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  ApartmentOutlined,
  PieChartOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { CSSProperties } from 'react';
import { GlassCard } from '../components/GlassCard';
import { AIAssistant } from '../components/AIAssistant';
import { InsightBanner, InsightData } from '../components/InsightBanner';
import { darkThemeTokens } from '../theme/tokens';
import { liquidGlassStyles } from '../theme/liquid-glass';

const { Header, Sider, Content } = Layout;

export interface NavItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

export interface EnterpriseLayoutProps {
  /**
   * Logo 区域
   */
  logo?: React.ReactNode;
  /**
   * 企业名称
   */
  brandName?: string;
  /**
   * 导航菜单
   */
  menuItems?: NavItem[];
  /**
   * 当前选中菜单
   */
  selectedKeys?: string[];
  /**
   * 默认展开菜单
   */
  defaultOpenKeys?: string[];
  /**
   * 头部操作区域
   */
  headerActions?: React.ReactNode;
  /**
   * 用户信息
   */
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  /**
   * 通知数量
   */
  notificationCount?: number;
  /**
   * 智能洞察数据
   */
  insights?: InsightData[];
  /**
   * 侧边栏宽度
   */
  siderWidth?: number;
  /**
   * 主题
   */
  theme?: 'dark' | 'light';
  /**
   * 子应用内容
   */
  children?: React.ReactNode;
  /**
   * 菜单点击回调
   */
  onMenuClick?: (key: string) => void;
  /**
   * 用户登出回调
   */
  onLogout?: () => void;
}

/**
 * 默认导航配置
 */
const defaultMenuItems: NavItem[] = [
  {
    key: 'dashboard',
    label: '数据概览',
    icon: <DashboardOutlined />,
  },
  {
    key: 'checkin',
    label: '签到管理',
    icon: <FundProjectionScreenOutlined />,
    children: [
      { key: 'checkin-records', label: '签到记录' },
      { key: 'checkin-config', label: '签到配置' },
    ],
  },
  {
    key: 'points',
    label: '积分管理',
    icon: <TrophyOutlined />,
    children: [
      { key: 'points-rules', label: '积分规则' },
      { key: 'points-records', label: '积分记录' },
      { key: 'points-adjust', label: '积分调整' },
    ],
  },
  {
    key: 'mall',
    label: '商城管理',
    icon: <ShoppingOutlined />,
    children: [
      { key: 'products', label: '商品管理' },
      { key: 'orders', label: '订单管理' },
      { key: 'categories', label: '分类管理' },
    ],
  },
  {
    key: 'users',
    label: '用户管理',
    icon: <TeamOutlined />,
    children: [
      { key: 'user-list', label: '用户列表' },
      { key: 'user-levels', label: '等级管理' },
      { key: 'user-badges', label: '徽章管理' },
    ],
  },
  {
    key: 'content',
    label: '内容管理',
    icon: <FileTextOutlined />,
    children: [
      { key: 'banners', label: 'Banner 管理' },
      { key: 'announcements', label: '公告管理' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    icon: <SafetyOutlined />,
    children: [
      { key: 'branding', label: '品牌设置' },
      { key: 'roles', label: '角色权限' },
      { key: 'tenants', label: '租户管理' },
    ],
  },
  {
    key: 'reports',
    label: '报表分析',
    icon: <PieChartOutlined />,
    children: [
      { key: 'trend', label: '趋势分析' },
      { key: 'realtime', label: '实时监控' },
    ],
  },
];

/**
 * EnterpriseLayout - 企业级液态玻璃布局系统
 */
export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({
  logo,
  brandName = 'Carbon Point',
  menuItems = defaultMenuItems,
  selectedKeys = [],
  defaultOpenKeys = [],
  headerActions,
  user,
  notificationCount = 0,
  insights = [],
  siderWidth = 240,
  theme: layoutTheme = 'dark',
  children,
  onMenuClick,
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 注入全局样式
  useEffect(() => {
    const styleId = 'cp-design-system-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = liquidGlassStyles;
      document.head.appendChild(styleEl);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '账户设置',
      icon: <SettingOutlined />,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout' && onLogout) {
      onLogout();
    }
  };

  // 渲染菜单
  const renderMenu = (items: NavItem[]): MenuProps['items'] => {
    return items.map((item) => {
      if (item.children) {
        return {
          key: item.key,
          icon: item.icon,
          label: item.label,
          children: renderMenu(item.children),
        };
      }
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
      };
    });
  };

  const isDark = layoutTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: darkThemeTokens.colorPrimary,
          borderRadius: darkThemeTokens.borderRadius,
          fontFamily: darkThemeTokens.fontFamily,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={siderWidth}
          collapsedWidth={80}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: isDark
              ? 'rgba(15, 15, 20, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            overflow: 'auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Logo 区域 */}
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '0' : '0 20px',
              gap: 12,
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              }}
            >
              {logo || <GlobalOutlined style={{ color: '#fff', fontSize: 18 }} />}
            </div>
            {!collapsed && (
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#18181B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {brandName}
              </span>
            )}
          </div>

          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={defaultOpenKeys}
            items={renderMenu(menuItems)}
            onClick={({ key }) => onMenuClick?.(key)}
            style={{
              background: 'transparent',
              border: 'none',
              marginTop: 8,
            }}
            theme={layoutTheme as 'dark' | 'light'}
          />
        </Sider>

        {/* 主内容区 */}
        <Layout
          style={{
            marginLeft: collapsed ? 80 : siderWidth,
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: isDark ? '#0f0f14' : '#f5f5f5',
          }}
        >
          {/* 头部 */}
          <Header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 99,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              height: 64,
              background: isDark
                ? 'rgba(15, 15, 20, 0.8)'
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* 左侧：折叠按钮 + 页面标题 */}
            <Flex align="center" gap={16}>
              <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {collapsed ? (
                  <MenuUnfoldOutlined style={{ fontSize: 18, color: isDark ? '#fff' : '#18181B' }} />
                ) : (
                  <MenuFoldOutlined style={{ fontSize: 18, color: isDark ? '#fff' : '#18181B' }} />
                )}
              </div>
            </Flex>

            {/* 右侧：操作区域 */}
            <Flex align="center" gap={12}>
              {headerActions}

              {/* 通知 */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Badge count={notificationCount} size="small" offset={[-2, 2]}>
                  <BellOutlined style={{ fontSize: 18, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }} />
                </Badge>
              </div>

              {/* 用户信息 */}
              <Dropdown
                menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 12px',
                    borderRadius: 12,
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Avatar
                    size={32}
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    }}
                  />
                  {user && (
                    <div style={{ lineHeight: 1.2 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#fff' : '#18181B' }}>
                        {user.name}
                      </div>
                      {user.role && (
                        <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                          {user.role}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Dropdown>
            </Flex>
          </Header>

          {/* 页面内容 */}
          <Content
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 64px)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* 智能洞察 Banner */}
            {insights.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <InsightBanner insights={insights} mode="carousel" autoRotateInterval={6000} />
              </div>
            )}

            {/* 主内容 */}
            {children}
          </Content>
        </Layout>

        {/* AI 助手 */}
        <AIAssistant
          defaultOpen={false}
          quickQuestions={[
            '今日运营概览',
            '用户增长趋势',
            '本周热门商品',
            '生成周报摘要',
          ]}
          theme={layoutTheme}
        />
      </Layout>
    </ConfigProvider>
  );
};

/**
 * 布局页脚
 */
export const LayoutFooter: React.FC<{ children?: React.ReactNode; style?: CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      textAlign: 'center',
      padding: '24px',
      color: 'rgba(255,255,255,0.4)',
      fontSize: 13,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      ...style,
    }}
  >
    {children || (
      <>
        Carbon Point © {new Date().getFullYear()} — 2026 前沿视觉设计
      </>
    )}
  </div>
);

/**
 * 页面标题组件
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  style?: CSSProperties;
}> = ({ title, subtitle, actions, breadcrumb, style }) => (
  <div
    style={{
      marginBottom: 24,
      ...style,
    }}
  >
    {breadcrumb && <div style={{ marginBottom: 12 }}>{breadcrumb}</div>}
    <Flex justify="space-between" align="flex-start">
      <div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#fff',
            margin: 0,
            lineHeight: 1.2,
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              margin: '8px 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </Flex>
  </div>
);

/**
 *  Bento Grid 网格布局
 */
export const BentoGrid: React.FC<{
  cols?: number;
  gap?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}> = ({ cols = 3, gap = 16, children, style }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Bento Grid Item
 */
export const BentoItem: React.FC<{
  span?: number;
  rowSpan?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}> = ({ span = 1, rowSpan = 1, children, style }) => (
  <div
    style={{
      gridColumn: span > 1 ? `span ${span}` : undefined,
      gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

export default EnterpriseLayout;
