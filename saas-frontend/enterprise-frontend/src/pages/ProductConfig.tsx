import React from 'react';
import { Tag, Switch, Space, Spin, Empty, Descriptions, Divider, message } from 'antd';
import { ShopOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@carbon-point/design-system';
import {
  getTenantProducts,
  getTenantProductRules,
  toggleTenantProductRule,
  getTenantBasicConfig,
  TenantProduct,
} from '@/api/tenantProducts';

interface RuleItem {
  id: number;
  ruleType: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

const categoryLabels: Record<string, string> = {
  stair_climbing: '爬楼',
  walking: '走路',
  checkin: '签到',
  points: '积分',
};

const categoryColors: Record<string, string> = {
  stair_climbing: '#6366F1',
  walking: '#10B981',
  checkin: '#F59E0B',
  points: '#3B82F6',
};

const ruleTypeColors: Record<string, string> = {
  time_slot: '#6366F1',
  daily_cap: '#EF4444',
  special_date: '#F59E0B',
  level_coefficient: '#10B981',
  consecutive_reward: '#8B5CF6',
};

const ProductRuleList: React.FC<{ productCode: string }> = ({ productCode }) => {
  const queryClient = useQueryClient();

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['tenant-product-rules', productCode],
    queryFn: () => getTenantProductRules(productCode),
    retry: 1,
  });

  const toggleMutation = useMutation({
    mutationFn: (ruleId: number) => toggleTenantProductRule(productCode, ruleId),
    onSuccess: () => {
      message.success('规则状态已更新');
      queryClient.invalidateQueries({ queryKey: ['tenant-product-rules', productCode] });
    },
    onError: () => {
      message.error('更新失败，请重试');
    },
  });

  if (rulesLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Spin size="small" />
      </div>
    );
  }

  const ruleList: RuleItem[] = Array.isArray(rules) ? rules : rules?.data || [];

  if (ruleList.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无规则配置"
        styles={{ description: { color: 'rgba(255,255,255,0.45)' } }}
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {ruleList.map((rule) => (
        <div
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Space size={10} align="center">
            <Tag
              style={{
                borderRadius: 16,
                padding: '2px 10px',
                fontSize: 12,
                border: 'none',
                background: `${ruleTypeColors[rule.ruleType] || '#6B7280'}20`,
                color: ruleTypeColors[rule.ruleType] || '#6B7280',
              }}
            >
              {rule.ruleType}
            </Tag>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              {rule.name}
            </span>
            {rule.config && Object.keys(rule.config).length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                ({Object.entries(rule.config).map(([k, v]) => `${k}: ${v}`).join(', ')})
              </span>
            )}
          </Space>
          <Switch
            checked={rule.enabled}
            onChange={() => toggleMutation.mutate(rule.id)}
            loading={toggleMutation.isPending}
          />
        </div>
      ))}
    </Space>
  );
};

const ProductBasicConfig: React.FC<{ productCode: string }> = ({ productCode }) => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['tenant-product-basic-config', productCode],
    queryFn: () => getTenantBasicConfig(productCode),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!config || (typeof config === 'object' && Object.keys(config).length === 0)) {
    return null;
  }

  const configData = (config as any)?.data || config;

  return (
    <Descriptions
      size="small"
      column={2}
      labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
      contentStyle={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}
    >
      {Object.entries(configData).map(([key, value]) => (
        <Descriptions.Item key={key} label={key}>
          {String(value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

const ProductConfig: React.FC = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  const productList: TenantProduct[] = Array.isArray(products) ? products : [];

  if (productList.length === 0) {
    return (
      <div style={{ padding: '0 0 24px' }}>
        <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
          产品配置
        </h2>
        <Empty description="暂无可配置的产品" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
        产品配置
      </h2>

      <Space direction="vertical" style={{ width: '100%' }} size={20}>
        {productList.map((product) => (
          <GlassCard key={product.productCode} hoverable>
            {/* Product Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <ShopOutlined style={{ fontSize: 20, color: categoryColors[product.category] || '#6366F1' }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                {product.productName}
              </span>
              <Tag
                style={{
                  borderRadius: 16,
                  padding: '2px 10px',
                  fontSize: 12,
                  border: 'none',
                  background: `${categoryColors[product.category] || '#6B7280'}20`,
                  color: categoryColors[product.category] || '#6B7280',
                }}
              >
                {categoryLabels[product.category] || product.category}
              </Tag>
            </div>

            {/* Feature Config Tags */}
            {product.featureConfig && Object.keys(product.featureConfig).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Space size={[8, 8]} wrap>
                  {Object.entries(product.featureConfig).map(([key, value]) => (
                    <Tag
                      key={key}
                      style={{
                        borderRadius: 16,
                        padding: '3px 12px',
                        fontSize: 12,
                        border: 'none',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      {key}: {value}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* Basic Config */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <SettingOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                  基本配置
                </span>
              </div>
              <ProductBasicConfig productCode={product.productCode} />
            </div>

            <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* Rules Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <SettingOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                  规则配置
                </span>
              </div>
              <ProductRuleList productCode={product.productCode} />
            </div>
          </GlassCard>
        ))}
      </Space>
    </div>
  );
};

export default ProductConfig;
