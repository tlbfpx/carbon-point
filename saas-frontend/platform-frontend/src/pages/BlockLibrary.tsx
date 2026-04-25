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
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
} from 'antd';
import {
  ThunderboltOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  ApiOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { EXTENSION_GUIDANCE } from '@/constants/feature-menu-map';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRegistryTriggers,
  getRegistryRuleNodes,
  getRegistryFeatures,
  getRegistryModules,
  createTriggerType,
  updateTriggerType,
  deleteTriggerType,
  createRuleNodeType,
  updateRuleNodeType,
  deleteRuleNodeType,
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  TriggerInfo,
  RuleNodeInfo,
  FeatureInfo,
  RegistryModule,
  TriggerType,
  RuleNodeType,
  Feature,
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

    text: {
      primary: '#1E293B',
      secondary: '#475569',
      tertiary: '#94A3B8',
      white: '#FFFFFF',
    },

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
          {module.ruleChain.map((node: string, i: number) => (
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
          {module.features.map((f: string) => (
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('triggers');

  // Trigger CRUD state
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TriggerType | null>(null);
  const [triggerForm] = Form.useForm();

  // Rule Node CRUD state
  const [ruleNodeModalOpen, setRuleNodeModalOpen] = useState(false);
  const [editingRuleNode, setEditingRuleNode] = useState<RuleNodeType | null>(null);
  const [ruleNodeForm] = Form.useForm();

  // Feature CRUD state
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureForm] = Form.useForm();

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

  // Features table query (for CRUD)
  const { data: featureListData, isLoading: featureListLoading, refetch: refetchFeatureList } = useQuery({
    queryKey: ['features-catalog'],
    queryFn: () => getFeatures({ size: 500 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const triggers: TriggerInfo[] = Array.isArray(triggersData) ? triggersData : (triggersData?.data || []);
  const ruleNodes: RuleNodeInfo[] = Array.isArray(ruleNodesData) ? ruleNodesData : (ruleNodesData?.data || []);
  const features: FeatureInfo[] = Array.isArray(featuresData) ? featuresData : (featuresData?.data || []);
  const modules: RegistryModule[] = Array.isArray(modulesData) ? modulesData : (modulesData?.data || []);
  const featureList: Feature[] = featureListData?.data?.records || featureListData?.records || (Array.isArray(featureListData) ? featureListData : []);

  // ---- Trigger CRUD ----
  const triggerCreateMutation = useMutation({
    mutationFn: createTriggerType,
    onSuccess: () => {
      message.success('创建成功');
      setTriggerModalOpen(false);
      triggerForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['registry-triggers'] });
    },
    onError: (err: any) => message.error(err?.message || '创建失败'),
  });

  const triggerUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTriggerType(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setTriggerModalOpen(false);
      setEditingTrigger(null);
      triggerForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['registry-triggers'] });
    },
    onError: (err: any) => message.error(err?.message || '更新失败'),
  });

  const triggerDeleteMutation = useMutation({
    mutationFn: deleteTriggerType,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['registry-triggers'] });
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  });

  const openTriggerCreate = () => {
    setEditingTrigger(null);
    triggerForm.resetFields();
    setTriggerModalOpen(true);
  };

  const openTriggerEdit = (record: TriggerInfo & { id?: string }) => {
    // The list endpoint returns TriggerInfo format; for edit we need the id
    // The GET triggers returns type as "type" field but the DB entity uses "id" as PK
    // We'll use the record data directly
    setEditingTrigger(record as any);
    triggerForm.setFieldsValue({
      code: record.type,
      name: record.name,
      description: record.description,
    });
    setTriggerModalOpen(true);
  };

  const handleTriggerFormFinish = (values: any) => {
    if (editingTrigger) {
      triggerUpdateMutation.mutate({ id: (editingTrigger as any).id || editingTrigger.type, data: values });
    } else {
      triggerCreateMutation.mutate(values);
    }
  };

  // ---- Rule Node CRUD ----
  const ruleNodeCreateMutation = useMutation({
    mutationFn: createRuleNodeType,
    onSuccess: () => {
      message.success('创建成功');
      setRuleNodeModalOpen(false);
      ruleNodeForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['registry-rule-nodes'] });
    },
    onError: (err: any) => message.error(err?.message || '创建失败'),
  });

  const ruleNodeUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRuleNodeType(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setRuleNodeModalOpen(false);
      setEditingRuleNode(null);
      ruleNodeForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['registry-rule-nodes'] });
    },
    onError: (err: any) => message.error(err?.message || '更新失败'),
  });

  const ruleNodeDeleteMutation = useMutation({
    mutationFn: deleteRuleNodeType,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['registry-rule-nodes'] });
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  });

  // ---- Feature CRUD ----
  const featureCreateMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      message.success('创建成功');
      setFeatureModalOpen(false);
      featureForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['features-catalog'] });
    },
    onError: (err: any) => message.error(err?.message || '创建失败'),
  });

  const featureUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFeature(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setFeatureModalOpen(false);
      setEditingFeature(null);
      featureForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['features-catalog'] });
    },
    onError: (err: any) => message.error(err?.message || '更新失败'),
  });

  const featureDeleteMutation = useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['features-catalog'] });
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  });

  const openFeatureCreate = () => {
    setEditingFeature(null);
    featureForm.resetFields();
    setFeatureModalOpen(true);
  };

  const openFeatureEdit = (record: Feature) => {
    setEditingFeature(record);
    featureForm.setFieldsValue({
      code: record.code,
      name: record.name,
      type: record.type,
      valueType: record.valueType,
      defaultValue: record.defaultValue,
      description: record.description,
      group: record.group,
    });
    setFeatureModalOpen(true);
  };

  const handleFeatureFormFinish = (values: any) => {
    if (editingFeature) {
      featureUpdateMutation.mutate({ id: editingFeature.id, data: values });
    } else {
      featureCreateMutation.mutate(values);
    }
  };

  const openRuleNodeCreate = () => {
    setEditingRuleNode(null);
    ruleNodeForm.resetFields();
    setRuleNodeModalOpen(true);
  };

  const openRuleNodeEdit = (record: RuleNodeInfo & { id?: string }) => {
    setEditingRuleNode(record as any);
    ruleNodeForm.setFieldsValue({
      code: record.name,
      name: record.name,
      description: record.description,
      sortOrder: record.sortOrder,
    });
    setRuleNodeModalOpen(true);
  };

  const handleRuleNodeFormFinish = (values: any) => {
    if (editingRuleNode) {
      ruleNodeUpdateMutation.mutate({ id: (editingRuleNode as any).id || editingRuleNode.name, data: values });
    } else {
      ruleNodeCreateMutation.mutate({ ...values, beanName: values.beanName || values.code });
    }
  };

  const handleRefresh = () => {
    switch (activeTab) {
      case 'triggers':
        refetchTriggers();
        break;
      case 'ruleNodes':
        refetchRuleNodes();
        break;
      case 'features':
        refetchFeatureList();
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
      width: 180,
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
      title: '说明',
      dataIndex: 'description',
      render: (desc: string) => (
        <Text style={{ color: DESIGN_SYSTEM.colors.text.secondary }}>
          {desc || '-'}
        </Text>
      ),
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: TriggerInfo & { id?: string }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openTriggerEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除此触发器类型？"
            onConfirm={() => triggerDeleteMutation.mutate((record as any).id || record.type)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
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
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: RuleNodeInfo & { id?: string }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openRuleNodeEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除此规则节点类型？"
            onConfirm={() => ruleNodeDeleteMutation.mutate((record as any).id || record.name)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const featureColumns = [
    {
      title: '编码',
      dataIndex: 'code',
      width: 180,
      render: (code: string) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{code}</span>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 140,
      render: (name: string) => (
        <Text strong style={{ fontSize: '14px', color: DESIGN_SYSTEM.colors.text.primary }}>
          {name}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => (
        <HighContrastTag color={type === 'permission' ? 'blue' : 'purple'}>
          {type === 'permission' ? '权限' : '配置'}
        </HighContrastTag>
      ),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 90,
      render: (vt: string) => (
        <HighContrastTag color="green">{vt || 'boolean'}</HighContrastTag>
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '分组',
      dataIndex: 'group',
      width: 100,
      render: (g: string) => g ? <HighContrastTag color="orange">{g}</HighContrastTag> : '-',
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: Feature) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openFeatureEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除此功能点？"
            onConfirm={() => featureDeleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
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
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openTriggerCreate}>
              新增触发器类型
            </Button>
          </div>
          <Table
            columns={triggerColumns}
            dataSource={triggers}
            rowKey="type"
            loading={triggersLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无触发器类型，点击上方按钮新增"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
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
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openRuleNodeCreate}>
              新增规则节点类型
            </Button>
          </div>
          <Table
            columns={ruleNodeColumns}
            dataSource={ruleNodes}
            rowKey="name"
            loading={ruleNodesLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无规则节点类型，点击上方按钮新增"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
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
          {featureList.length > 0 && (
            <Badge
              count={featureList.length}
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
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openFeatureCreate}>
              新增功能点
            </Button>
          </div>
          <Table
            columns={featureColumns}
            dataSource={featureList}
            rowKey="id"
            loading={featureListLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="暂无功能点，点击上方按钮新增"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
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
            管理系统中所有积木组件（触发器、规则节点、功能点、产品模块）
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

      {/* Trigger Type Modal */}
      <Modal
        title={editingTrigger ? '编辑触发器类型' : '新增触发器类型'}
        open={triggerModalOpen}
        onCancel={() => { setTriggerModalOpen(false); setEditingTrigger(null); triggerForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={triggerForm} layout="vertical" onFinish={handleTriggerFormFinish}>
          {editingTrigger ? (
            <Form.Item label="编码">
              <Input value={editingTrigger.type} disabled />
            </Form.Item>
          ) : (
            <Form.Item
              name="code"
              label="编码"
              rules={[{ required: true, message: '请输入触发器编码' }]}
              extra="唯一标识，如 check_in、sensor_data，创建后不可修改"
            >
              <Input placeholder="如: check_in" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入触发器名称' }]}
          >
            <Input placeholder="如: 打卡触发器" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="触发器描述（选填）" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={triggerCreateMutation.isPending || triggerUpdateMutation.isPending}
              >
                {editingTrigger ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setTriggerModalOpen(false); setEditingTrigger(null); triggerForm.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Rule Node Type Modal */}
      <Modal
        title={editingRuleNode ? '编辑规则节点类型' : '新增规则节点类型'}
        open={ruleNodeModalOpen}
        onCancel={() => { setRuleNodeModalOpen(false); setEditingRuleNode(null); ruleNodeForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={ruleNodeForm} layout="vertical" onFinish={handleRuleNodeFormFinish}>
          {editingRuleNode ? (
            <Form.Item label="编码">
              <Input value={editingRuleNode.name} disabled />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="code"
                label="节点编码"
                rules={[{ required: true, message: '请输入节点编码' }]}
                extra="唯一标识，如 time_slot_match，创建后不可修改"
              >
                <Input placeholder="如: time_slot_match" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
              <Form.Item
                name="beanName"
                label="Bean 名称"
                rules={[{ required: true, message: '请输入对应的 Java Bean 名称' }]}
                extra="对应 RuleNode 实现类的 getName() 返回值，如 timeSlotMatch"
              >
                <Input placeholder="如: timeSlotMatch" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="name"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="如: 时段匹配" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="规则节点描述（选填）" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={ruleNodeCreateMutation.isPending || ruleNodeUpdateMutation.isPending}
              >
                {editingRuleNode ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setRuleNodeModalOpen(false); setEditingRuleNode(null); ruleNodeForm.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Feature Modal */}
      <Modal
        title={editingFeature ? '编辑功能点' : '新增功能点'}
        open={featureModalOpen}
        onCancel={() => { setFeatureModalOpen(false); setEditingFeature(null); featureForm.resetFields(); }}
        footer={null}
        width={520}
      >
        <Form form={featureForm} layout="vertical" onFinish={handleFeatureFormFinish}>
          {editingFeature ? (
            <Form.Item label="编码">
              <Input value={editingFeature.code} disabled />
            </Form.Item>
          ) : (
            <Form.Item
              name="code"
              label="编码"
              rules={[{ required: true, message: '请输入功能点编码' }]}
              extra="唯一标识，如 daily_cap、time_slot，创建后不可修改"
            >
              <Input placeholder="如: daily_cap" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入功能点名称' }]}
          >
            <Input placeholder="如: 每日上限" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true, message: '请选择类型' }]}
              style={{ width: 220 }}
            >
              <Select placeholder="选择类型">
                <Select.Option value="permission">权限（开关）</Select.Option>
                <Select.Option value="config">配置（参数）</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="valueType"
              label="值类型"
              rules={[{ required: true, message: '请选择值类型' }]}
              style={{ width: 220 }}
            >
              <Select placeholder="选择值类型">
                <Select.Option value="boolean">Boolean</Select.Option>
                <Select.Option value="number">Number</Select.Option>
                <Select.Option value="string">String</Select.Option>
                <Select.Option value="json">JSON</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="defaultValue" label="默认值">
            <Input placeholder="如: true、100、{}" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="group" label="分组">
            <Input placeholder="如: point_rule、display（选填）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="功能点描述（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={featureCreateMutation.isPending || featureUpdateMutation.isPending}
              >
                {editingFeature ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setFeatureModalOpen(false); setEditingFeature(null); featureForm.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BlockLibrary;
