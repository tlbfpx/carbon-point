import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  InputNumber,
  Switch,
  Checkbox,
  Empty,
  Tooltip,
  Badge,
  Steps,
  Alert,
  Typography,
} from 'antd';
const { Text } = Typography;
import { GlassCard } from '@carbon-point/design-system';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  HolderOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getRegistryModules,
  getRegistryRuleNodes,
  getRegistryFeatures,
  Product as PlatformProduct,
  RegistryModule,
  RuleNodeInfo,
  FeatureInfo,
  getProductPackages,
} from '@/api/platform';
import { extractArray } from '@/utils';
import { EXTENSION_GUIDANCE } from '@/constants/feature-menu-map';
import RuleNodeConfigModal from '@/components/RuleNodeConfigModal';
import VisualRuleChainEditor from '@/components/rule-chain/VisualRuleChainEditor';

const CATEGORY_OPTIONS = [
  { value: 'stairs_climbing', label: '爬楼积分', color: 'blue' },
  { value: 'walking', label: '走路积分', color: 'green' },
] as const;

const TRIGGER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  stairs_climbing: { label: '爬楼打卡', color: 'blue' },
  walking: { label: '走路计步', color: 'green' },
};

const RULE_NODE_LABELS: Record<string, string> = {
  timeSlotMatch: '时段匹配',
  randomBase: '随机基数',
  specialDateMultiplier: '特殊日期倍率',
  levelCoefficient: '等级系数',
  round: '数值取整',
  dailyCap: '每日上限',
  thresholdFilter: '步数阈值过滤',
  formulaCalc: '步数公式换算',
};

const FEATURE_LABELS: Record<string, string> = {
  consecutive_reward: '连续打卡奖励',
  special_date: '特殊日期',
  fun_equivalence: '趣味等价物',
  points_exchange: '积分兑换',
  time_slot: '时段规则',
  daily_cap: '每日上限',
  holiday_bonus: '节假日加成',
};

const PlatformProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct | null>(null);
  const [form] = Form.useForm();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<{
    code: string;
    name: string;
    category: string;
    description: string;
    triggerType: string;
    ruleChain: string[];
    ruleChainConfigs: Record<string, string>;
    features: string[];
  }>({
    code: '',
    name: '',
    category: '',
    description: '',
    triggerType: '',
    ruleChain: [],
    ruleChainConfigs: {},
    features: [],
  });

  const [ruleNodeConfigModalOpen, setRuleNodeConfigModalOpen] = useState(false);
  const [configuringRuleNode, setConfiguringRuleNode] = useState<string>('');
  const [configuringRuleNodeIndex, setConfiguringRuleNodeIndex] = useState<number>(-1);

  const [productPackagesMap, setProductPackagesMap] = useState<Record<string, { id: string; code: string; name: string }[]>>({});

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['platform-products', page, pageSize, categoryFilter],
    queryFn: () => getProducts({ page, size: pageSize, category: categoryFilter }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: registryModulesData } = useQuery({
    queryKey: ['registry-modules'],
    queryFn: getRegistryModules,
    enabled: wizardOpen,
    retry: false,
  });

  const { data: registryRuleNodesData } = useQuery({
    queryKey: ['registry-rule-nodes'],
    queryFn: getRegistryRuleNodes,
    enabled: wizardOpen,
    retry: false,
  });

  const { data: registryFeaturesData } = useQuery({
    queryKey: ['registry-features'],
    queryFn: getRegistryFeatures,
    enabled: wizardOpen,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['platform-products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; status?: number; sortOrder?: number } }) => updateProduct(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['platform-products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['platform-products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: PlatformProduct) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
      sortOrder: record.sortOrder,
    });
    setModalOpen(true);
  };

  const openWizard = () => {
    setWizardStep(0);
    setWizardData({
      code: '',
      name: '',
      category: '',
      description: '',
      triggerType: '',
      ruleChain: [],
      ruleChainConfigs: {},
      features: [],
    });
    setWizardOpen(true);
  };

  const wizardModules: RegistryModule[] = extractArray<RegistryModule>(registryModulesData);
  const wizardRuleNodes: RuleNodeInfo[] = extractArray<RuleNodeInfo>(registryRuleNodesData);
  const wizardFeatures: FeatureInfo[] = extractArray<FeatureInfo>(registryFeaturesData);

  const handleWizardNext = () => {
    if (wizardStep === 0) {
      if (!wizardData.code || !wizardData.name || !wizardData.category) {
        message.warning('请填写产品编码、名称和分类');
        return;
      }
    }
    if (wizardStep === 1 && !wizardData.triggerType) {
      message.warning('请选择触发器类型');
      return;
    }
    setWizardStep(wizardStep + 1);
  };

  const handleWizardPrev = () => {
    setWizardStep(wizardStep - 1);
  };

  const handleWizardFinish = () => {
    createMutation.mutate(
      {
        code: wizardData.code,
        name: wizardData.name,
        category: wizardData.category,
        description: wizardData.description,
        status: 1,
        sortOrder: 0,
        triggerType: wizardData.triggerType || undefined,
        ruleChainConfig: wizardData.ruleChain.length > 0
          ? JSON.stringify({
              nodes: wizardData.ruleChain,
              configs: wizardData.ruleChainConfigs,
            })
          : undefined,
        features: wizardData.features,
      },
      {
        onSuccess: () => {
          setWizardOpen(false);
          message.success('产品创建成功');
        },
      }
    );
  };

  const openRuleNodeConfig = (nodeName: string, index: number) => {
    setConfiguringRuleNode(nodeName);
    setConfiguringRuleNodeIndex(index);
    setRuleNodeConfigModalOpen(true);
  };

  const handleRuleNodeConfigSave = (configJson: string) => {
    setWizardData((prev) => ({
      ...prev,
      ruleChainConfigs: {
        ...prev.ruleChainConfigs,
        [`${configuringRuleNode}-${configuringRuleNodeIndex}`]: configJson,
      },
    }));
    setRuleNodeConfigModalOpen(false);
    setConfiguringRuleNode('');
    setConfiguringRuleNodeIndex(-1);
  };

  const handleWizardCategoryChange = (category: string) => {
    const moduleCodeMap: Record<string, string> = {
      stairs_climbing: 'stair_climbing',
      walking: 'walking',
    };
    const moduleCode = moduleCodeMap[category];
    const matchingModule = wizardModules.find((m) => m.code === moduleCode);
    if (matchingModule) {
      setWizardData((prev) => ({
        ...prev,
        category,
        triggerType: matchingModule.triggerType,
        ruleChain: matchingModule.ruleChain || [],
        features: matchingModule.features || [],
      }));
    } else {
      setWizardData((prev) => ({
        ...prev,
        category,
        triggerType: '',
        ruleChain: [],
        features: [],
      }));
    }
  };

  const moveRuleChainItem = (index: number, direction: 'up' | 'down') => {
    const newChain = [...wizardData.ruleChain];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChain.length) return;
    [newChain[index], newChain[targetIndex]] = [newChain[targetIndex], newChain[index]];
    setWizardData((prev) => ({ ...prev, ruleChain: newChain }));
  };

  const handleFormFinish = (values: { code?: string; name: string; description?: string; status: number; sortOrder: number; category?: string }) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: values });
    } else {
      const dataToCreate = {
        ...values,
        code: values.code || values.name.toLowerCase().replace(/\s+/g, '_'),
      };
      createMutation.mutate(dataToCreate as any);
    }
  };

  const getCategoryConfig = (category: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === category) || { label: category, color: 'default' };

  const products = productsData?.records || (Array.isArray(productsData) ? productsData : []);
  const total = productsData?.total || products.length;

  const loadProductPackages = async (productIds: string[]) => {
    const newMap: Record<string, { id: string; code: string; name: string }[]> = {};
    await Promise.all(productIds.map(async (pid) => {
      try {
        const res = await getProductPackages(pid);
        const pkgs = Array.isArray(res) ? res : [];
        if (pkgs.length > 0) newMap[pid] = pkgs;
      } catch { /* ignore */ }
    }));
    setProductPackagesMap((prev) => ({ ...prev, ...newMap }));
  };

  React.useEffect(() => {
    if (products.length > 0) {
      const idsToFetch = products
        .map((p: PlatformProduct) => p.id)
        .filter((id: string) => !productPackagesMap[id]);
      if (idsToFetch.length > 0) loadProductPackages(idsToFetch);
    }
  }, [products]);

  const columns = [
    { title: '产品编码', dataIndex: 'code', width: 140 },
    { title: '产品名称', dataIndex: 'name' },
    {
      title: '触发类型',
      dataIndex: 'category',
      width: 110,
      render: (category: string) => {
        const trigger = TRIGGER_TYPE_MAP[category];
        return trigger ? (
          <Tag color={trigger.color}>{trigger.label}</Tag>
        ) : (
          <Tag>{category}</Tag>
        );
      },
    },
    {
      title: '功能点',
      dataIndex: 'featureCount',
      width: 90,
      render: (n: number) => <Badge count={n ?? 0} showZero color="blue" style={{ marginLeft: 4 }} />,
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    { title: '创建时间', dataIndex: 'createTime', width: 110, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '关联套餐',
      width: 160,
      render: (_: unknown, record: PlatformProduct) => {
        const pkgs = productPackagesMap[record.id];
        if (!pkgs || pkgs.length === 0) return <Text type="secondary">—</Text>;
        const visible = pkgs.slice(0, 2);
        const remaining = pkgs.length - 2;
        return (
          <Space size={4} wrap>
            {visible.map((p) => (
              <Tag key={p.id} color="blue">{p.name}</Tag>
            ))}
            {remaining > 0 && <Tag>+{remaining}</Tag>}
          </Space>
        );
      },
    },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, record: PlatformProduct) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => navigate(`/platform-products/${record.id}/config`)}>
            配置
          </Button>
          <Popconfirm
            title="确认删除该产品？"
            description="删除后不可恢复"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>平台产品管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openWizard}>
            配置产品
          </Button>
          <Button icon={<PlusOutlined />} onClick={openCreateModal}>
            快速创建
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="筛选分类"
          allowClear
          style={{ width: 150 }}
          value={categoryFilter}
          onChange={(val) => { setCategoryFilter(val); setPage(1); }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="暂无产品数据" /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
        }}
      />

      {/* Wizard */}
      <Modal
        title="配置产品"
        open={wizardOpen}
        onCancel={() => setWizardOpen(false)}
        width={720}
        footer={null}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          message="基于已注册的产品模块配置产品实例"
          style={{ marginBottom: 16 }}
        />
        <Steps current={wizardStep} style={{ marginBottom: 24 }} items={[
          { title: '基本信息' },
          { title: '选择触发器' },
          { title: '组装规则链' },
          { title: '选择功能点' },
        ]} />

        {wizardStep === 0 && (
          <Form layout="vertical">
            <Form.Item label="产品编码" required>
              <Input placeholder="如: stairs_basic" value={wizardData.code} onChange={(e) => setWizardData((prev) => ({ ...prev, code: e.target.value }))} />
            </Form.Item>
            <Form.Item label="产品名称" required>
              <Input placeholder="请输入产品名称" value={wizardData.name} onChange={(e) => setWizardData((prev) => ({ ...prev, name: e.target.value }))} />
            </Form.Item>
            <Form.Item label="产品分类" required>
              <Select placeholder="请选择产品分类" value={wizardData.category || undefined} onChange={handleWizardCategoryChange}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea rows={3} placeholder="描述（选填）" value={wizardData.description} onChange={(e) => setWizardData((prev) => ({ ...prev, description: e.target.value }))} />
            </Form.Item>
          </Form>
        )}

        {wizardStep === 1 && (
          <div>
            <div style={{ display: 'grid', gap: 12 }}>
              {wizardModules.map((module) => {
                const isSelected = wizardData.triggerType === module.triggerType;
                return (
                  <GlassCard
                    key={module.code}
                    size="small"
                    hoverable
                    style={{
                      border: isSelected ? '2px solid #6366F1' : '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setWizardData((prev) => ({
                        ...prev,
                        triggerType: module.triggerType,
                        ruleChain: module.ruleChain || [],
                        features: module.features || [],
                      }));
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Space><Text strong>{module.trigger?.name || module.triggerType}</Text><Tag color="geekblue">{module.name}</Tag></Space>
                        <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{module.trigger?.description}</div>
                      </div>
                      {isSelected && <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 20 }} />}
                    </div>
                  </GlassCard>
                );
              })}
              {wizardModules.length === 0 && <Empty description="暂无可用的触发器" />}
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <VisualRuleChainEditor
              ruleChain={wizardData.ruleChain}
              ruleChainConfigs={wizardData.ruleChainConfigs}
              availableNodes={wizardRuleNodes.filter((n) => !wizardData.ruleChain.includes(n.name))}
              onChange={(chain, configs) => setWizardData((prev) => ({ ...prev, ruleChain: chain, ruleChainConfigs: configs }))}
              onNodeConfig={(nodeName, index) => openRuleNodeConfig(nodeName, index)}
            />
          </div>
        )}

        {wizardStep === 3 && (
          <div>
            {wizardFeatures.map((feature) => {
              const isSelected = wizardData.features.includes(feature.type);
              return (
                <div
                  key={feature.type}
                  style={{
                    padding: '12px 16px',
                    marginBottom: 8,
                    background: isSelected ? '#f6ffed' : '#fafafa',
                    borderRadius: 6,
                    border: isSelected ? '1px solid #b7eb8f' : '1px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setWizardData((prev) => ({
                      ...prev,
                      features: isSelected ? prev.features.filter((f) => f !== feature.type) : [...prev.features, feature.type],
                    }));
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space><Checkbox checked={isSelected} /><Text strong>{FEATURE_LABELS[feature.type] || feature.name}</Text><Tag color="orange">{feature.type}</Tag></Space>
                    {isSelected && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button onClick={() => setWizardStep(wizardStep - 1)} disabled={wizardStep === 0}>上一步</Button>
          <Space>
            <Button onClick={() => setWizardOpen(false)}>取消</Button>
            {wizardStep < 3 ? (
              <Button type="primary" onClick={handleWizardNext}>下一步</Button>
            ) : (
              <Button type="primary" onClick={handleWizardFinish} loading={createMutation.isPending}>确认创建</Button>
            )}
          </Space>
        </div>
      </Modal>

      <Modal
        title={editingProduct ? '编辑产品' : '快速创建产品'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          {!editingProduct && (
            <>
              <Form.Item name="code" label="产品编码" rules={[{ required: true, message: '请输入产品编码' }]}>
                <Input placeholder="如: stairs_basic" />
              </Form.Item>
              <Form.Item name="category" label="产品分类" rules={[{ required: true, message: '请选择产品分类' }]}>
                <Select placeholder="请选择产品分类">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}
          {editingProduct && (
            <>
              <Form.Item label="产品编码"><Input value={editingProduct.code} disabled /></Form.Item>
              <Form.Item label="产品分类">
                <Tag color={getCategoryConfig(editingProduct.category).color}>{getCategoryConfig(editingProduct.category).label}</Tag>
              </Form.Item>
            </>
          )}
          <Form.Item name="name" label="产品名称" rules={[{ required: true }]}><Input placeholder="请输入产品名称" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} placeholder="描述" /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(checked) => checked ? 1 : 0} initialValue={1}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>{editingProduct ? '保存修改' : '确认创建'}</Button>
              <Button onClick={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <RuleNodeConfigModal
        open={ruleNodeConfigModalOpen}
        nodeName={configuringRuleNode}
        initialConfig={configuringRuleNodeIndex >= 0 ? wizardData.ruleChainConfigs[`${configuringRuleNode}-${configuringRuleNodeIndex}`] : undefined}
        onCancel={() => { setRuleNodeConfigModalOpen(false); setConfiguringRuleNode(''); setConfiguringRuleNodeIndex(-1); }}
        onSave={handleRuleNodeConfigSave}
      />
    </div>
  );
};

export default PlatformProductManagement;
