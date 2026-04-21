import React from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Code,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
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

interface BlockLibraryTabProps {
  className?: string;
}

const BlockLibraryTab: React.FC<BlockLibraryTabProps> = () => {
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

  const moduleColumns = [
    {
      title: '模块编码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Code>{code}</Code>,
    },
    {
      title: '模块名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '触发器类型',
      dataIndex: 'triggerType',
      key: 'triggerType',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '规则链',
      dataIndex: 'ruleChain',
      key: 'ruleChain',
      render: (chain: string[]) => (
        <Space wrap>
          {chain?.map((node) => (
            <Tag key={node} size="small">{node}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '功能点',
      dataIndex: 'features',
      key: 'features',
      render: (feats: string[]) => (
        <Space wrap>
          {feats?.map((feat) => (
            <Tag key={feat} color="green" size="small">{feat}</Tag>
          ))}
        </Space>
      ),
    },
  ];

  const triggerColumns = [
    {
      title: '触发器类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Code>{type}</Code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const ruleNodeColumns = [
    {
      title: '规则节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Code>{name}</Code>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
    },
  ];

  const featureColumns = [
    {
      title: '功能点类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Code>{type}</Code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '必需',
      dataIndex: 'required',
      key: 'required',
      render: (required: boolean) => (
        required ? <Tag color="orange">是</Tag> : <Tag>否</Tag>
      ),
    },
    {
      title: '默认配置',
      dataIndex: 'defaultConfig',
      key: 'defaultConfig',
      render: (config: Record<string, unknown>) => (
        <Code className="text-xs">{JSON.stringify(config)}</Code>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'modules',
      label: '产品模块',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetchModules()}>
              刷新
            </Button>
          </div>
          <Table
            columns={moduleColumns}
            dataSource={modules}
            rowKey="code"
            loading={modulesLoading}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'triggers',
      label: '触发器',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetchTriggers()}>
              刷新
            </Button>
          </div>
          <Table
            columns={triggerColumns}
            dataSource={triggers}
            rowKey="type"
            loading={triggersLoading}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'ruleNodes',
      label: '规则节点',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetchRuleNodes()}>
              刷新
            </Button>
          </div>
          <Table
            columns={ruleNodeColumns}
            dataSource={ruleNodes}
            rowKey="name"
            loading={ruleNodesLoading}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'features',
      label: '功能点',
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={() => refetchFeatures()}>
              刷新
            </Button>
          </div>
          <Table
            columns={featureColumns}
            dataSource={features}
            rowKey="type"
            loading={featuresLoading}
            pagination={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Title level={5}>积木组件库</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        查看系统中已注册的所有积木组件（触发器、规则节点、功能点、产品模块）
      </Text>
      <Tabs items={tabItems} />
    </div>
  );
};

export default BlockLibraryTab;
