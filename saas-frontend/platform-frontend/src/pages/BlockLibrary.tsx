import React, { useState } from 'react';
import {
  Table,
  Tabs,
  Tag,
  Empty,
  Space,
  Descriptions,
  Badge,
  Typography,
} from 'antd';
import {
  ThunderboltOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { GlassCard } from '@carbon-point/design-system';
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

const { Text } = Typography;

const BlockLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('triggers');

  const { data: triggersData, isLoading: triggersLoading } = useQuery({
    queryKey: ['registry-triggers'],
    queryFn: getRegistryTriggers,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: ruleNodesData, isLoading: ruleNodesLoading } = useQuery({
    queryKey: ['registry-rule-nodes'],
    queryFn: getRegistryRuleNodes,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ['registry-features'],
    queryFn: getRegistryFeatures,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: modulesData } = useQuery({
    queryKey: ['registry-modules'],
    queryFn: getRegistryModules,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const triggers: TriggerInfo[] = triggersData?.data || [];
  const ruleNodes: RuleNodeInfo[] = ruleNodesData?.data || [];
  const features: FeatureInfo[] = featuresData?.data || [];
  const modules: RegistryModule[] = modulesData?.data || [];

  const triggerColumns = [
    {
      title: '触发器类型',
      dataIndex: 'type',
      width: 140,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '关联产品',
      dataIndex: 'productCode',
      width: 140,
      render: (code: string) => {
        const module = modules.find((m) => m.code === code);
        return module ? (
          <Tag color="geekblue">{module.name}</Tag>
        ) : (
          <Tag>{code}</Tag>
        );
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => desc || '-',
    },
  ];

  const ruleNodeColumns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 70,
      render: (_: unknown, __: unknown, index: number) => (
        <Badge
          count={index + 1}
          style={{ backgroundColor: '#1890ff' }}
          overflowCount={99}
        />
      ),
    },
    {
      title: '节点标识',
      dataIndex: 'name',
      width: 200,
      render: (name: string) => (
        <Space>
          <Tag color="purple">{name}</Tag>
        </Space>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '所属产品',
      width: 200,
      render: (_: unknown, record: RuleNodeInfo) => {
        const related = modules.filter(
          (m) => m.ruleChain && m.ruleChain.includes(record.name)
        );
        return related.length > 0 ? (
          <Space wrap>
            {related.map((m) => (
              <Tag key={m.code} color="geekblue">
                {m.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>通用</Tag>
        );
      },
    },
  ];

  const featureColumns = [
    {
      title: '功能点标识',
      dataIndex: 'type',
      width: 180,
      render: (type: string) => <Tag color="orange">{type}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 140,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '是否必需',
      dataIndex: 'required',
      width: 90,
      render: (required: boolean) =>
        required ? (
          <Tag color="red">必需</Tag>
        ) : (
          <Tag color="default">可选</Tag>
        ),
    },
    {
      title: '所属产品',
      width: 200,
      render: (_: unknown, record: FeatureInfo) => {
        const related = modules.filter(
          (m) => m.features && m.features.includes(record.type)
        );
        return related.length > 0 ? (
          <Space wrap>
            {related.map((m) => (
              <Tag key={m.code} color="geekblue">
                {m.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Tag>通用</Tag>
        );
      },
    },
  ];

  const renderModulesOverview = () => {
    if (modules.length === 0) {
      return <Empty description="暂无已注册的产品模块" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {modules.map((module) => (
          <GlassCard key={module.code} size="small" hoverable>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="产品编码">
                <Tag color="blue">{module.code}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="产品名称">
                <Text strong>{module.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="触发类型">
                <Tag color="geekblue">{module.triggerType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="规则链">
                <Space wrap>
                  {(module.ruleChain || []).map((node, i) => (
                    <Tag key={node} color="purple" style={{ fontSize: 11 }}>
                      {i + 1}. {node}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="功能点">
                <Space wrap>
                  {(module.features || []).map((f) => (
                    <Tag key={f} color="orange" style={{ fontSize: 11 }}>
                      {f}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </GlassCard>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>积木组件库</h2>
      </div>

      {/* Modules Overview */}
      <GlassCard title="已注册产品模块" style={{ marginBottom: 16 }}>
        {renderModulesOverview()}
      </GlassCard>

      {/* Component Tabs */}
      <GlassCard>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'triggers',
              label: (
                <span>
                  <ThunderboltOutlined style={{ marginRight: 6 }} />
                  触发器
                </span>
              ),
              children: (
                <Table
                  columns={triggerColumns}
                  dataSource={triggers}
                  rowKey="type"
                  loading={triggersLoading}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        description="暂无已注册的触发器"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              ),
            },
            {
              key: 'ruleNodes',
              label: (
                <span>
                  <ApartmentOutlined style={{ marginRight: 6 }} />
                  规则节点
                </span>
              ),
              children: (
                <Table
                  columns={ruleNodeColumns}
                  dataSource={ruleNodes}
                  rowKey="name"
                  loading={ruleNodesLoading}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        description="暂无已注册的规则节点"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              ),
            },
            {
              key: 'features',
              label: (
                <span>
                  <AppstoreOutlined style={{ marginRight: 6 }} />
                  功能点模板
                </span>
              ),
              children: (
                <Table
                  columns={featureColumns}
                  dataSource={features}
                  rowKey="type"
                  loading={featuresLoading}
                  pagination={false}
                  locale={{
                    emptyText: (
                      <Empty
                        description="暂无已注册的功能点模板"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              ),
            },
          ]}
        />
      </GlassCard>
    </div>
  );
};

export default BlockLibrary;
