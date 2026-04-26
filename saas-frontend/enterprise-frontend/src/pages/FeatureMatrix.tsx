import React from 'react';
import { Card, Row, Col, Tag, Typography, Spin, Empty } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BarChartOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useBranding } from '@/components/BrandingProvider';
import { apiClient } from '@/api/request';
import { useFeatureStore } from '@/store/featureStore';

const { Title, Text } = Typography;

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  sortOrder: number;
  children?: MenuItem[];
  disabled: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  TeamOutlined: <TeamOutlined />,
  SettingOutlined: <SettingOutlined />,
  ShopOutlined: <ShopOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
};

const CATEGORY_MAP: Record<string, { key: string; label: string; color: string }> = {
  dashboard: { key: 'core', label: '核心功能', color: '#4f46e5' },
  members: { key: 'core', label: '核心功能', color: '#4f46e5' },
  points: { key: 'core', label: '核心功能', color: '#4f46e5' },
  rules: { key: 'operation', label: '运营工具', color: '#0891b2' },
  products: { key: 'operation', label: '运营工具', color: '#0891b2' },
  orders: { key: 'operation', label: '运营工具', color: '#0891b2' },
  reports: { key: 'data', label: '数据管理', color: '#059669' },
  roles: { key: 'data', label: '数据管理', color: '#059669' },
  branding: { key: 'data', label: '数据管理', color: '#059669' },
};

const DEFAULT_CATEGORIES = [
  { key: 'core', label: '核心功能', color: '#4f46e5' },
  { key: 'operation', label: '运营工具', color: '#0891b2' },
  { key: 'data', label: '数据管理', color: '#059669' },
];

const fetchMenus = async (): Promise<MenuItem[]> => {
  const res = await apiClient.get('/api/menus');
  return (res as { data: MenuItem[] }).data ?? [];
};

const FeatureMatrix: React.FC = () => {
  const { primaryColor } = useBranding();
  const { features, loaded: featuresLoaded } = useFeatureStore();

  const { data: menus, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: fetchMenus,
  });

  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    sectionBg: '#f5f3f0',
  };

  const flatMenus = React.useMemo(() => {
    if (!menus) return [];
    const result: MenuItem[] = [];
    const flatten = (items: MenuItem[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children?.length) flatten(item.children);
      }
    };
    flatten(menus);
    return result;
  }, [menus]);

  const getIcon = (iconName?: string) => {
    if (!iconName) return <QuestionCircleOutlined />;
    return ICON_MAP[iconName] || <QuestionCircleOutlined />;
  };

  const getCategory = (key: string) => CATEGORY_MAP[key] ?? null;

  const renderFeatureCard = (item: MenuItem) => {
    const featureEnabled = featuresLoaded ? features[item.key] === true : !item.disabled;
    return (
    <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
      <Card
        hoverable
        style={{
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          opacity: featureEnabled ? 1 : 0.5,
          marginBottom: 16,
        }}
        styles={{ body: { padding: '20px' } }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${colors.primary}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: colors.primary,
            marginBottom: 16,
          }}
        >
          {getIcon(item.icon)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text
            strong
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 16,
              color: colors.textHeading,
            }}
          >
            {item.label}
          </Text>
          {featureEnabled ? (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
              style={{
                borderRadius: 20,
                fontSize: 11,
                fontFamily: 'Noto Sans SC, sans-serif',
                border: 'none',
              }}
            >
              已启用
            </Tag>
          ) : (
            <Tag
              style={{
                borderRadius: 20,
                fontSize: 11,
                fontFamily: 'Noto Sans SC, sans-serif',
                background: colors.sectionBg,
                color: colors.textMuted,
                border: `1px solid ${colors.warmBorder}`,
              }}
            >
              未启用
            </Tag>
          )}
        </div>
        <Text
          style={{
            fontFamily: 'Noto Sans SC, sans-serif',
            fontSize: 13,
            color: colors.textMuted,
            display: 'block',
            lineHeight: 1.5,
          }}
        >
          {item.path || item.key}
        </Text>
      </Card>
    </Col>
    );
  };

  const groupedFeatures = React.useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    for (const item of flatMenus) {
      const cat = getCategory(item.key);
      const catKey = cat?.key ?? 'other';
      if (!groups[catKey]) groups[catKey] = [];
      groups[catKey].push(item);
    }
    return groups;
  }, [flatMenus]);

  const allCategories = React.useMemo(() => {
    const cats = [...DEFAULT_CATEGORIES];
    if (groupedFeatures['other']) {
      cats.push({ key: 'other', label: '其他功能', color: '#6b7280' });
    }
    return cats;
  }, [groupedFeatures]);

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" tip="加载功能列表..." />
      </div>
    );
  }

  if (!flatMenus.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无功能菜单数据" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px 0', fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <Title
          level={2}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 4,
            color: colors.textHeading,
          }}
        >
          功能点阵
        </Title>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>
          查看企业已启用功能模块总览
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {allCategories.map((cat) => {
          const items = groupedFeatures[cat.key] ?? [];
          const enabledCount = items.filter((f) => featuresLoaded ? features[f.key] === true : !f.disabled).length;
          return (
            <Col xs={24} sm={8} key={cat.key}>
              <Card
                style={{
                  borderRadius: 16,
                  border: `1px solid ${colors.warmBorder}`,
                  boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
                }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `${cat.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: cat.color }}>
                      {enabledCount}
                    </span>
                  </div>
                  <div>
                    <Text
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                        color: colors.textHeading,
                        display: 'block',
                      }}
                    >
                      {cat.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      {enabledCount} 个功能模块
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Row gutter={[16, 16]}>
          {flatMenus.map(renderFeatureCard)}
        </Row>
      </Card>
    </div>
  );
};

export default FeatureMatrix;
