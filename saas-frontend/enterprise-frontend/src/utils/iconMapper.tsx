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
};

export const getIconComponent = (iconName?: string): React.ReactNode => {
  if (!iconName) return null;
  const IconComponent = iconMap[iconName];
  if (!IconComponent) {
    return <AppstoreOutlined />;
  }
  return <IconComponent />;
};
