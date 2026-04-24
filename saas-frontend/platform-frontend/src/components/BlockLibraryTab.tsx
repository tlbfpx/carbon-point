import React, { useState } from 'react';
import {
  Tabs,
  Typography,
  Button,
  Badge,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getRegistryModules,
  getRegistryTriggers,
  getRegistryRuleNodes,
  getRegistryFeatures,
  RegistryModule,
  TriggerInfo,
  RuleNodeInfo,
  FeatureInfo,
} from '@/api/platform';

const { Title, Text } = Typography;

// 设计系统常量
const DESIGN_SYSTEM = {
  colors: {
    bg: '#020617',
    surface: '#0F172A',
    surfaceHover: '#1E293B',
    border: '#1E293B',
    borderHover: '#334155',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    primary: '#22C55E',
    primarySoft: '#22C55E20',
    purple: '#8B5CF6',
    purpleSoft: '#8B5CF620',
    cyan: '#06B6D4',
    cyanSoft: '#06B6D420',
    green: '#22C55E',
    greenSoft: '#22C55E20',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
};

interface BlockLibraryTabProps {
  className?: string;
}

// 卡片组件
const ItemCard = ({
  icon,
  title,
  subtitle,
  description,
  tags,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: Array<{ text: string; bg: string; border: string; color: string }>;
  iconBg: string;
  iconColor: string;
}) => (
  <div
    style={{
      background: DESIGN_SYSTEM.colors.surface,
      border: `1px solid ${DESIGN_SYSTEM.colors.border}`,
      borderRadius: DESIGN_SYSTEM.radius.xl,
      padding: DESIGN_SYSTEM.spacing.xxl,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      animation: 'fadeIn 0.4s ease forwards',
      opacity: 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = DESIGN_SYSTEM.colors.surfaceHover;
      e.currentTarget.style.borderColor = DESIGN_SYSTEM.colors.borderHover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = DESIGN_SYSTEM.colors.surface;
      e.currentTarget.style.borderColor = DESIGN_SYSTEM.colors.border;
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: DESIGN_SYSTEM.spacing.lg, marginBottom: DESIGN_SYSTEM.spacing.lg }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: DESIGN_SYSTEM.radius.lg,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: DESIGN_SYSTEM.colors.text,
            marginBottom: DESIGN_SYSTEM.spacing.xs,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '13px',
              fontFamily: "'Fira Code', 'Courier New', monospace",
              color: DESIGN_SYSTEM.colors.textMuted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>

    {description && (
      <div
        style={{
          fontSize: '14px',
          color: DESIGN_SYSTEM.colors.textSecondary,
          lineHeight: 1.6,
          marginBottom: DESIGN_SYSTEM.spacing.lg,
        }}
      >
        {description}
      </div>
    )}

    {tags && tags.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: DESIGN_SYSTEM.spacing.sm }}>
        {tags.map((tag, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: tag.color,
              background: tag.bg,
              borderRadius: DESIGN_SYSTEM.radius.md,
              border: `1px solid ${tag.border}`,
            }}
          >
            {tag.text}
          </span>
        ))}
      </div>
    )}
  </div>
);

// 空状态组件
const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 40px',
    }}
  >
    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5, color: DESIGN_SYSTEM.colors.textMuted }}>
      {icon}
    </div>
    <div style={{ fontSize: 14, color: DESIGN_SYSTEM.colors.textMuted }}>
      {message}
    </div>
  </div>
);

// 加载状态
const LoadingState = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px',
    }}
  >
    <Spin size="large" style={{ color: DESIGN_SYSTEM.colors.primary }} />
  </div>
);

// 模块列表
const ModuleGrid = ({ data, loading }: { data?: RegistryModule[]; loading: boolean }) => {
  if (loading) return <LoadingState />;
  if (!data || data.length === 0) {
    return <EmptyState icon={<AppstoreOutlined />} message="暂无产品模块" />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: DESIGN_SYSTEM.spacing.xl,
      }}
    >
      {data.map((module, idx) => (
        <div
          key={module.code}
          style={{ animationDelay: `${idx * 0.06}s` }}
        >
          <ItemCard
            icon={<AppstoreOutlined />}
            iconBg={DESIGN_SYSTEM.colors.purpleSoft}
            iconColor={DESIGN_SYSTEM.colors.purple}
            title={module.name}
            subtitle={module.code}
            tags={[
              {
                text: module.triggerType,
                bg: DESIGN_SYSTEM.colors.purpleSoft,
                border: '#8B5CF640',
                color: '#C4B5FD',
              },
              ...(module.ruleChain && module.ruleChain.length > 0 ? [{
                text: `${module.ruleChain.length} 规则节点`,
                bg: DESIGN_SYSTEM.colors.primarySoft,
                border: '#22C55E40',
                color: '#6EE7B7',
              }] : []),
              ...(module.features && module.features.length > 0 ? [{
                text: `${module.features.length} 功能点`,
                bg: DESIGN_SYSTEM.colors.cyanSoft,
                border: '#06B6D440',
                color: '#67E8F9',
              }] : []),
            ].filter(Boolean) as Array<{ text: string; bg: string; border: string; color: string }>}
          />
        </div>
      ))}
    </div>
  );
};

// 触发器列表
const TriggerGrid = ({ data, loading }: { data?: TriggerInfo[]; loading: boolean }) => {
  if (loading) return <LoadingState />;
  if (!data || data.length === 0) {
    return <EmptyState icon={<ThunderboltOutlined />} message="暂无触发器" />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: DESIGN_SYSTEM.spacing.xl,
      }}
    >
      {data.map((trigger, idx) => (
        <div
          key={trigger.type}
          style={{ animationDelay: `${idx * 0.06}s` }}
        >
          <ItemCard
            icon={<ThunderboltOutlined />}
            iconBg={DESIGN_SYSTEM.colors.cyanSoft}
            iconColor={DESIGN_SYSTEM.colors.cyan}
            title={trigger.name}
            subtitle={trigger.type}
            description={trigger.description}
            tags={[
              {
                text: '触发器',
                bg: DESIGN_SYSTEM.colors.cyanSoft,
                border: '#06B6D440',
                color: '#67E8F9',
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
};

// 规则节点列表
const RuleNodeGrid = ({ data, loading }: { data?: RuleNodeInfo[]; loading: boolean }) => {
  if (loading) return <LoadingState />;
  if (!data || data.length === 0) {
    return <EmptyState icon={<ApiOutlined />} message="暂无规则节点" />;
  }

  const sortedData = [...(data || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: DESIGN_SYSTEM.spacing.xl,
      }}
    >
      {sortedData.map((node, idx) => (
        <div
          key={node.name}
          style={{ animationDelay: `${idx * 0.06}s` }}
        >
          <ItemCard
            icon={<ApiOutlined />}
            iconBg={DESIGN_SYSTEM.colors.purpleSoft}
            iconColor={DESIGN_SYSTEM.colors.purple}
            title={node.name}
            subtitle={`#${node.sortOrder || idx + 1}`}
            description={node.description}
            tags={[
              {
                text: '规则节点',
                bg: DESIGN_SYSTEM.colors.purpleSoft,
                border: '#8B5CF640',
                color: '#C4B5FD',
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
};

// 功能点列表
const FeatureGrid = ({ data, loading }: { data?: FeatureInfo[]; loading: boolean }) => {
  if (loading) return <LoadingState />;
  if (!data || data.length === 0) {
    return <EmptyState icon={<SettingOutlined />} message="暂无功能点" />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: DESIGN_SYSTEM.spacing.xl,
      }}
    >
      {data.map((feature, idx) => (
        <div
          key={feature.type}
          style={{ animationDelay: `${idx * 0.06}s` }}
        >
          <ItemCard
            icon={<SettingOutlined />}
            iconBg={DESIGN_SYSTEM.colors.greenSoft}
            iconColor={DESIGN_SYSTEM.colors.green}
            title={feature.name}
            subtitle={feature.type}
            description={feature.description}
            tags={[
              feature.required ? {
                text: '必需',
                bg: '#EF444420',
                border: '#EF444440',
                color: '#FCA5A5',
              } : {
                text: '可选',
                bg: '#47556930',
                border: '#64748B40',
                color: '#94A3B8',
              },
            ].filter(Boolean) as Array<{ text: string; bg: string; border: string; color: string }>}
          />
        </div>
      ))}
    </div>
  );
};

const BlockLibraryTab: React.FC<BlockLibraryTabProps> = () => {
  const [activeTab, setActiveTab] = useState('modules');

  const { data: modules, isLoading: modulesLoading, refetch: refetchModules } = useQuery({
    queryKey: ['registry-modules'],
    queryFn: getRegistryModules,
  });

  const { data: triggers, isLoading: triggersLoading, refetch: refetchTriggers } = useQuery({
    queryKey: ['registry-triggers'],
    queryFn: getRegistryTriggers,
  });

  const { data: ruleNodes, isLoading: ruleNodesLoading, refetch: refetchRuleNodes } = useQuery({
    queryKey: ['registry-rule-nodes'],
    queryFn: getRegistryRuleNodes,
  });

  const { data: features, isLoading: featuresLoading, refetch: refetchFeatures } = useQuery({
    queryKey: ['registry-features'],
    queryFn: getRegistryFeatures,
  });

  const getCounts = () => ({
    modules: modules?.length || 0,
    triggers: triggers?.length || 0,
    ruleNodes: ruleNodes?.length || 0,
    features: features?.length || 0,
  });

  const counts = getCounts();

  const tabItems = [
    {
      key: 'modules',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AppstoreOutlined style={{ fontSize: 16 }} />
          产品模块
          <Badge
            count={counts.modules}
            color={DESIGN_SYSTEM.colors.purple}
            style={{
              backgroundColor: 'transparent',
              color: '#C4B5FD',
              border: `1px solid ${DESIGN_SYSTEM.colors.purpleSoft}`,
            }}
          />
        </span>
      ),
      children: <ModuleGrid data={modules} loading={modulesLoading} />,
    },
    {
      key: 'triggers',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ThunderboltOutlined style={{ fontSize: 16 }} />
          触发器
          <Badge
            count={counts.triggers}
            color={DESIGN_SYSTEM.colors.cyan}
            style={{
              backgroundColor: 'transparent',
              color: '#67E8F9',
              border: `1px solid ${DESIGN_SYSTEM.colors.cyanSoft}`,
            }}
          />
        </span>
      ),
      children: <TriggerGrid data={triggers} loading={triggersLoading} />,
    },
    {
      key: 'ruleNodes',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ApiOutlined style={{ fontSize: 16 }} />
          规则节点
          <Badge
            count={counts.ruleNodes}
            color={DESIGN_SYSTEM.colors.purple}
            style={{
              backgroundColor: 'transparent',
              color: '#C4B5FD',
              border: `1px solid ${DESIGN_SYSTEM.colors.purpleSoft}`,
            }}
          />
        </span>
      ),
      children: <RuleNodeGrid data={ruleNodes} loading={ruleNodesLoading} />,
    },
    {
      key: 'features',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingOutlined style={{ fontSize: 16 }} />
          功能点
          <Badge
            count={counts.features}
            color={DESIGN_SYSTEM.colors.green}
            style={{
              backgroundColor: 'transparent',
              color: '#6EE7B7',
              border: `1px solid ${DESIGN_SYSTEM.colors.greenSoft}`,
            }}
          />
        </span>
      ),
      children: <FeatureGrid data={features} loading={featuresLoading} />,
    },
  ];

  const handleRefresh = () => {
    switch (activeTab) {
      case 'modules':
        refetchModules();
        break;
      case 'triggers':
        refetchTriggers();
        break;
      case 'ruleNodes':
        refetchRuleNodes();
        break;
      case 'features':
        refetchFeatures();
        break;
    }
  };

  return (
    <div style={{ position: 'relative', background: DESIGN_SYSTEM.colors.bg, minHeight: '100vh' }}>
      {/* 动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ant-tabs-nav {
          margin-bottom: 28px !important;
          background: transparent !important;
        }

        .ant-tabs-tab {
          padding: 12px 20px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: ${DESIGN_SYSTEM.colors.textMuted} !important;
          transition: all 0.2s ease !important;
          background: transparent !important;
          border: none !important;
        }

        .ant-tabs-tab:hover {
          color: ${DESIGN_SYSTEM.colors.text} !important;
        }

        .ant-tabs-tab-active {
          color: ${DESIGN_SYSTEM.colors.text} !important;
        }

        .ant-tabs-ink-bar {
          background: ${DESIGN_SYSTEM.colors.primary} !important;
          height: 2px !important;
          border-radius: 2px !important;
        }

        .ant-tabs-nav-list {
          gap: 4px !important;
        }
      `}</style>

      {/* 标题区域 */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title
              level={3}
              style={{
                margin: 0,
                color: DESIGN_SYSTEM.colors.text,
                fontWeight: 700,
                fontSize: '28px',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}
            >
              积木组件库
            </Title>
            <Text
              style={{
                color: DESIGN_SYSTEM.colors.textSecondary,
                fontSize: '15px',
              }}
            >
              查看系统中已注册的所有积木组件（触发器、规则节点、功能点、产品模块）
            </Text>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{
              borderRadius: DESIGN_SYSTEM.radius.lg,
              height: '42px',
              padding: '0 20px',
              background: DESIGN_SYSTEM.colors.surface,
              border: `1px solid ${DESIGN_SYSTEM.colors.border}`,
              color: DESIGN_SYSTEM.colors.text,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = DESIGN_SYSTEM.colors.surfaceHover;
              e.currentTarget.style.borderColor = DESIGN_SYSTEM.colors.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = DESIGN_SYSTEM.colors.surface;
              e.currentTarget.style.borderColor = DESIGN_SYSTEM.colors.border;
            }}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarStyle={{ marginBottom: 28 }}
      />
    </div>
  );
};

export default BlockLibraryTab;
