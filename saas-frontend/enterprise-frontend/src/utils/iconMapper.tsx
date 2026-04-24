import React from 'react';
import {
  DashboardOutlined,
  UpOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  NumberOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  // 企业菜单动态渲染所需的额外图标
  TeamOutlined,
  ShopOutlined,
  SafetyOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SkinOutlined,
  WomanOutlined,
  SwapOutlined,
  SmileOutlined,
  BookOutlined,
} from '@ant-design/icons';

const iconMap: Record<string, React.ComponentType<any>> = {
  DashboardOutlined: DashboardOutlined,
  UpOutlined: UpOutlined,
  EnvironmentOutlined: EnvironmentOutlined,
  FileTextOutlined: FileTextOutlined,
  ClockCircleOutlined: ClockCircleOutlined,
  CalendarOutlined: CalendarOutlined,
  TrophyOutlined: TrophyOutlined,
  NumberOutlined: NumberOutlined,
  AppstoreOutlined: AppstoreOutlined,
  ShoppingOutlined: ShoppingOutlined,
  UserOutlined: UserOutlined,
  BarChartOutlined: BarChartOutlined,
  SettingOutlined: SettingOutlined,
  // 企业菜单图标映射（参考 enterprise-package-menu-design.md §4.2）
  TeamOutlined: TeamOutlined,
  ShopOutlined: ShopOutlined,
  SafetyOutlined: SafetyOutlined,
  BellOutlined: BellOutlined,
  LogoutOutlined: LogoutOutlined,
  MenuFoldOutlined: MenuFoldOutlined,
  MenuUnfoldOutlined: MenuUnfoldOutlined,
  SkinOutlined: SkinOutlined,
  WomanOutlined: WomanOutlined,
  SwapOutlined: SwapOutlined,
  SmileOutlined: SmileOutlined,
  BookOutlined: BookOutlined,
};

export const getIconComponent = (iconName?: string): React.ReactNode => {
  if (!iconName) return null;
  const IconComponent = iconMap[iconName];
  if (!IconComponent) {
    return <AppstoreOutlined />;
  }
  return <IconComponent />;
};
