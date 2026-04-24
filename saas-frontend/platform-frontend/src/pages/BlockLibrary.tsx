import React, { useState } from 'react';
import {
  Table,
  Tabs,
  Empty,
  Space,
  Badge,
  Typography,
  Alert,
  Button,
} from 'antd';
import {
  ThunderboltOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  ApiOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { EXTENSION_GUIDANCE } from '@/constants/feature-menu-map';
import { useQuery } from '@tanstack/react-query';
import {
  getRegistryTriggers,
  getRegistryRuleNodes,
  getRegistryFeatures,
  getRegistryModules,
  TriggerInfo,
  RuleNodeInfo,
  FeatureInfo,
  RegistryModule,
} from '@/api/platform';

const { Title, Text } = Typography;

// 设计系统 — 统一 slate 色阶
const DESIGN_SYSTEM = {
  colors: {
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',

    // 标签配色
    tags: {
      blue: { bg: '#EEF2FF', border: '#C7D2FE', color: '#4338CA' },
      purple: { bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9' },
      cyan: { bg: '#ECFEFF', border: '#A5F3FC', color: '#0E7490' },
      green: { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857' },
      orange: { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
      red: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
      gray: { bg: '#F8FAFC', border: '#E2E8F0', color: '#475569' },
      geekblue: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
    },

    // 文字颜色 — slate 色阶
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      tertiary: '#94A3B8',
      white: '#FFFFFF',
    },

    // 背景色
    bg: {
      white: '#FFFFFF',
      light: '#F8FAFC',
      border: 'rgba(0, 0, 0, 0.06)',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
};

// 高对比度标签组件
const HighContrastTag = ({
  children,
  color = 'blue'
}: {
  children: React.ReactNode;
  color?: keyof typeof DESIGN_SYSTEM.colors.tags;
}) => {
  const tagStyle = DESIGN_SYSTEM.colors.tags[color];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        fontSize: '13px',
        fontWeight: 500 as const,
        color: tagStyle.color,
        background: tagStyle.bg,
        border: `1px solid ${tagStyle.border}`,
        borderRadius: DESIGN_SYSTEM.radius.md,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
};

// 模块卡片组件
const ModuleCard = ({ module }: { module: RegistryModule }) => (
  <div
    style={{
      background: DESIGN_SYSTEM.colors.bg.white,
      border: `1px solid ${DESIGN_SYSTEM.colors.bg.border}`,
      borderRadius: DESIGN_SYSTEM.radius.lg,
      padding: DESIGN_SYSTEM.spacing.lg,
    }}
  >
    <div style={{ marginBottom: DESIGN_SYSTEM.spacing.md }}>
      <Text strong style={{ fontSize: '16px', color: DESIGN_SYSTEM.colors.text.primary }}>
        {module.name}
      </Text>
    </div>

    <div style={{ marginBottom: DESIGN_SYSTEM.spacing.md }}>
      <Text type="secondary" style={{ fontSize: '13px' }}>产品编码：</Text>
      <HighContrastTag color="blue">{module.code}</HighContrastTag>
    </div>

    <div style={{ marginBottom: DESIGN_SYSTEM.spacing.md }}>
      <Text type="secondary" style={{ fontSize: '13px' }}>触发类型：</Text>
      <HighContrastTag color="geekblue">{module.triggerType}</HighContrastTag>
    </div>

    {module.ruleChain && module.ruleChain.length > 0 && (
      <div style={{ marginBottom: DESIGN_SYSTEM.spacing.md }}>
        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>
          规则链：
        </Text>
        <Space wrap size="small">
          {module.ruleChain.map((node, i) => (
            <HighContrastTag key={node} color="purple">
              {i + 1}. {node}
            </HighContrastTag>
          ))}
        </Space>
      </div>
    )}

    {module.features && module.features.length > 0 && (
      <div>
        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>
          功能点：
        </Text>
        <Space wrap size="small">
          {module.features.map((f) => (
            <HighContrastTag key={f} color="orange">
              {f}
            </HighContrastTag>
          ))}
        </Space>
      </div>
    )}
  </div>
);

const BlockLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('triggers');

  const { data: triggersData, isLoading: triggersLoading, refetch: refetchTriggers } = useQuery({
    queryKey: ['registry-triggers'],
    queryFn: getRegistryTriggers,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: ruleNodesData, isLoading: ruleNodesLoading, refetch: refetchRuleNodes } = useQuery({
    queryKey: ['registry-rule-nodes'],
    queryFn: getRegistryRuleNodes,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: featuresData, isLoading: featuresLoading, refetch: refetchFeatures } = useQuery({
    queryKey: ['registry-features'],
    queryFn: getRegistryFeatures,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: modulesData, refetch: refetchModules } = useQuery({
    queryKey: ['registry-modules'],
    queryFn: getRegistryModules,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const triggers: TriggerInfo[] = Array.isArray(triggersData) ? triggersData : (triggersData?.data || []);
  const ruleNodes: RuleNodeInfo[] = Array.isArray(ruleNodesData) ? ruleNodesData : (ruleNodesData?.data || []);
  const features: FeatureInfo[] = Array.isArray(featuresData) ? featuresData : (featuresData?.data || []);
  const modules: RegistryModule[] = Array.isArray(modulesData) ? modulesData : (modulesData?.data || []);

  const handleRefresh = () => {
    switch (activeTab) {
      case 'triggers':
        refetchTriggers();
        break;
      case 'ruleNodes':
        refetchRuleNodes();
        break;
      case 'features':
        refetchFeatures();
        break;
      case 'modules':
        refetchModules();
        break;
    }
  };

  const triggerColumns = [
    {
      title: '触发器类型',
      dataIndex: 'type',
      width: 160,
      render: (type: string) => <HighContrastTag color="blue">{type}</HighContrastTag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      render: (name: string) => (
        <Text strong style={{ fontSize: '14px', color: DESIGN_SYSTEM.colors.text.primary }}>
          {name}
        </Text>
      ),
    },
    {
      title: '关联产品',
      dataIndex: 'productCode',
      width: 160,
      render: (code: string) => {
        const module = modules.find((m) => m.code === code);
        return module ? (
          <HighContrastTag color="geekblue">{module.name}</HighContrastTag>
        ) : (
          <HighContrastTag color="gray">{code}</HighContrastTag>
        );
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => (
        <Text style={{ color: DESIGN_SYSTEM.colors.text.secondary }}>
          {desc || '-'}
        </Text>
      ),
    },
  ];

  const ruleNodeColumns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      render: (_: unknown, __: unknown, index: number) => (
        <Badge
          count={index + 1}
          style={{
            backgroundColor: DESIGN_SYSTEM.colors.primary,
            color: DESIGN_SYSTEM.colors.text.white,
            fontWeight: 600,
          }}
          overflowCount={99}
        />
      ),
    },
    {
      title: '节点标识',
      dataIndex: 'name',
      width: 220,
      render: (name: string) => (
        <HighContrastTag color="purple">{name}</HighContrastTag>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => (
        <Text style={{ color: DESIGN_SYSTEM.colors.text.secondary }}>
          {desc || '-'}
        </Text>
      ),
    },
    {
      title: '所属产品',
      width: 240,
      render: (_: unknown, record: RuleNodeInfo) => {
        const related = modules.filter(
          (m) => m.ruleChain && m.ruleChain.includes(record.name)
        );
        return related.length > 0 ? (
          <Space wrap size="small">
            {related.map((m) => (
              <HighContrastTag key={m.code} color="geekblue">
                {m.name}
              </HighContrastTag>
            ))}
          </Space>
        ) : (
          <HighContrastTag color="gray">通用</HighContrastTag>
        );
      },
    },
  ];

  const featureColumns = [
    {
      title: '功能点标识',
      dataIndex: 'type',
      width: 200,
      render: (type: string) => <HighContrastTag color="orange">{type}</HighContrastTag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (name: string) => (
        <Text strong style={{ fontSize: '14px', color: DESIGN_SYSTEM.colors.text.primary }}>
          {name}
        </Text>
      ),
    },
    {
      title: '是否必需',
      dataIndex: 'required',
      width: 100,
      render: (required: boolean) =>
        required ? (
          <HighContrastTag color="red">必需</HighContrastTag>
        ) : (
          <HighContrastTag color="gray">可选</HighContrastTag>
        ),
    },
    {
      title: '所属产品',
      width: 240,
      render: (_: unknown, record: FeatureInfo) => {
        const related = modules.filter(
          (m) => m.features && m.features.includes(record.type)
        );
        return related.length > 0 ? (
          <Space wrap size="small">
            {related.map((m) => (
              <HighContrastTag key={m.code} color="geekblue">
                {m.name}
              </HighContrastTag>
            ))}
          </Space>
        ) : (
          <HighContrastTag color="gray">通用</HighContrastTag>
        );
      },
    },
  ];

  const renderModulesOverview = () => {
    if (modules.length === 0) {
      return <Empty description="暂无已注册的产品模块" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: DESIGN_SYSTEM.spacing.lg
      }}>
        {modules.map((module) => (
          <ModuleCard key={module.code} module={module} />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'modules',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          产品模块
          {modules.length > 0 && (
            <Badge
              count={modules.length}
              style={{
                backgroundColor: DESIGN_SYSTEM.colors.primary,
                marginLeft: 8,
              }}
            />
          )}
        </span>
      ),
      children: (
        <>
          {renderModulesOverview()}
          <Alert
            type="info"
            showIcon
            message={EXTENSION_GUIDANCE.title}
            description={EXTENSION_GUIDANCE.description}
            style={{ marginTop: 24 }}
          />
        </>
      ),
    },
    {
      key: 'triggers',
      label: (
        <span>
          <ThunderboltOutlined style={{ marginRight: 6 }} />
          触发器
          {triggers.length > 0 && (
            <Badge
              count={triggers.length}
              style={{
                backgroundColor: DESIGN_SYSTEM.colors.cyan,
                marginLeft: 8,
              }}
            />
          )}
        </span>
      ),
      children: (
        <>
          <Table
            columns={triggerColumns}
            dataSource={triggers}
            rowKey="type"
            loading={triggersLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无已注册的触发器。请联系开发团队添加新的触发器类型。"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
          <Alert
            type="info"
            showIcon
            message={EXTENSION_GUIDANCE.title}
            description={EXTENSION_GUIDANCE.description}
            style={{ marginTop: 16 }}
          />
        </>
      ),
    },
    {
      key: 'ruleNodes',
      label: (
        <span>
          <ApiOutlined style={{ marginRight: 6 }} />
          规则节点
          {ruleNodes.length > 0 && (
            <Badge
              count={ruleNodes.length}
              style={{
                backgroundColor: DESIGN_SYSTEM.colors.purple,
                marginLeft: 8,
              }}
            />
          )}
        </span>
      ),
      children: (
        <>
          <Table
            columns={ruleNodeColumns}
            dataSource={ruleNodes}
            rowKey="name"
            loading={ruleNodesLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无已注册的规则节点。请联系开发团队添加新的规则节点类型。"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
          <Alert
            type="info"
            showIcon
            message={EXTENSION_GUIDANCE.title}
            description={EXTENSION_GUIDANCE.description}
            style={{ marginTop: 16 }}
          />
        </>
      ),
    },
    {
      key: 'features',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 6 }} />
          功能点模板
          {features.length > 0 && (
            <Badge
              count={features.length}
              style={{
                backgroundColor: DESIGN_SYSTEM.colors.warning,
                marginLeft: 8,
              }}
            />
          )}
        </span>
      ),
      children: (
        <>
          <Table
            columns={featureColumns}
            dataSource={features}
            rowKey="type"
            loading={featuresLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无已注册的功能点模板。请联系开发团队添加新的功能点类型。"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
          <Alert
            type="info"
            showIcon
            message={EXTENSION_GUIDANCE.title}
            description={EXTENSION_GUIDANCE.description}
            style={{ marginTop: 16 }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      {/* 标题区域 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
            积木组件库
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>
            查看系统中已注册的所有积木组件（触发器、规则节点、功能点、产品模块）
          </p>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          style={{ borderRadius: 8 }}
        >
          刷新
        </Button>
      </div>

      {/* Tabs */}
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
        padding: 20,
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{ marginBottom: 24 }}
        />
      </div>
    </div>
  );
};

export default BlockLibrary;
