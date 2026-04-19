import React from 'react';
import { Card, Row, Col, Tag, Typography } from 'antd';
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
} from '@ant-design/icons';
import { useBranding } from '@/components/BrandingProvider';

const { Title, Text } = Typography;

interface Feature {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
}

const categories = [
  { key: 'core', label: '核心功能', color: '#4f46e5' },
  { key: 'operation', label: '运营工具', color: '#0891b2' },
  { key: 'data', label: '数据管理', color: '#059669' },
];

const features: Feature[] = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: '数据看板',
    description: '查看企业整体运营数据概况',
    category: 'core',
    enabled: true,
  },
  {
    key: 'members',
    icon: <TeamOutlined />,
    label: '员工管理',
    description: '管理企业内部员工账户与信息',
    category: 'core',
    enabled: true,
  },
  {
    key: 'points',
    icon: <TrophyOutlined />,
    label: '积分运营',
    description: '配置积分规则与运营策略',
    category: 'core',
    enabled: true,
  },
  {
    key: 'rules',
    icon: <SettingOutlined />,
    label: '规则配置',
    description: '设置打卡规则与积分计算规则',
    category: 'operation',
    enabled: true,
  },
  {
    key: 'products',
    icon: <ShopOutlined />,
    label: '商品管理',
    description: '管理积分商城虚拟商品',
    category: 'operation',
    enabled: true,
  },
  {
    key: 'orders',
    icon: <ShoppingOutlined />,
    label: '订单管理',
    description: '查看和处理商品兑换订单',
    category: 'operation',
    enabled: true,
  },
  {
    key: 'reports',
    icon: <BarChartOutlined />,
    label: '数据报表',
    description: '查看详细数据报表与趋势分析',
    category: 'data',
    enabled: true,
  },
  {
    key: 'roles',
    icon: <SafetyOutlined />,
    label: '角色权限',
    description: '配置企业角色与菜单权限',
    category: 'data',
    enabled: true,
  },
  {
    key: 'branding',
    icon: <AppstoreOutlined />,
    label: '品牌配置',
    description: '自定义企业 Logo 与品牌色',
    category: 'data',
    enabled: true,
  },
  {
    key: 'feature-matrix',
    icon: <AppstoreOutlined />,
    label: '功能点阵',
    description: '功能模块概览与状态',
    category: 'core',
    enabled: true,
  },
];

const FeatureMatrix: React.FC = () => {
  const { primaryColor } = useBranding();

  const colors = {
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#faf8f5',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    sectionBg: '#f5f3f0',
  };

  const renderFeatureCard = (feature: Feature) => (
    <Col xs={24} sm={12} md={8} lg={6} key={feature.key}>
      <Card
        hoverable
        style={{
          borderRadius: 16,
          border: `1px solid ${colors.warmBorder}`,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          opacity: feature.enabled ? 1 : 0.5,
          marginBottom: 16,
        }}
        styles={{
          body: {
            padding: '20px',
          },
        }}
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
          {feature.icon}
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
            {feature.label}
          </Text>
          {feature.enabled ? (
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
          {feature.description}
        </Text>
      </Card>
    </Col>
  );

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
        {categories.map((cat) => {
          const count = features.filter((f) => f.category === cat.key && f.enabled).length;
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
                      {count}
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
                      {count} 个功能模块
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
          {features.map(renderFeatureCard)}
        </Row>
      </Card>
    </div>
  );
};

export default FeatureMatrix;
