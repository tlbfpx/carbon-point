import React, { useState } from 'react';
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
  Drawer,
  Descriptions,
  Badge,
  Timeline,
  Steps,
  Alert,
  Typography,
} from 'antd';
const { Text, Title } = Typography;
import { GlassCard } from '@carbon-point/design-system';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  EyeOutlined,
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
  getProductFeatures,
  updateProductFeatures,
  getFeatures,
  getRegistryModules,
  getRegistryRuleNodes,
  getRegistryFeatures,
  Product,
  Feature,
  RegistryModule,
  RuleNodeInfo,
  FeatureInfo,
  ProductFeature,
  getProductPackages,
} from '@/api/platform';
import { extractArray } from '@/utils';
import { EXTENSION_GUIDANCE } from '@/constants/feature-menu-map';
import RuleNodeConfigModal from '@/components/RuleNodeConfigModal';

const CATEGORY_OPTIONS = [
  { value: 'stairs_climbing', label: '爬楼积分', color: 'blue' },
  { value: 'walking', label: '走路积分', color: 'green' },
] as const;

const TRIGGER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  stairs_climbing: { label: '爬楼打卡', color: 'blue' },
  walking: { label: '走路计步', color: 'green' },
};

// Rule node display names
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

// Feature display names
const FEATURE_LABELS: Record<string, string> = {
  consecutive_reward: '连续打卡奖励',
  special_date: '特殊日期',
  fun_equivalence: '趣味等价物',
  points_exchange: '积分兑换',
  time_slot: '时段规则',
  daily_cap: '每日上限',
  holiday_bonus: '节假日加成',
};

const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, { enabled: boolean; required: boolean; configValue?: string }>>({});
  const [form] = Form.useForm();

  // Wizard state
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

  // Rule node config modal state
  const [ruleNodeConfigModalOpen, setRuleNodeConfigModalOpen] = useState(false);
  const [configuringRuleNode, setConfiguringRuleNode] = useState<string>('');
  const [configuringRuleNodeIndex, setConfiguringRuleNodeIndex] = useState<number>(-1);

  // Success modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Product-package association map: productId → package brief list
  const [productPackagesMap, setProductPackagesMap] = useState<Record<string, { id: string; code: string; name: string }[]>>({});

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products', page, pageSize, categoryFilter],
    queryFn: () => getProducts({ page, size: pageSize, category: categoryFilter }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: featuresData } = useQuery({
    queryKey: ['all-features'],
    queryFn: () => getFeatures({ size: 100 }),
    enabled: featureModalOpen,
  });

  const { data: drawerProductFeatures, isLoading: drawerFeaturesLoading } = useQuery({
    queryKey: ['product-features-detail', drawerProduct?.id],
    queryFn: () => getProductFeatures(drawerProduct!.id),
    enabled: !!drawerProduct?.id && drawerOpen,
    retry: false,
  });

  // Registry data for wizard
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: ({ productId, features }: { productId: string; features: { featureId: string; isEnabled: boolean; isRequired: boolean; configValue?: string }[] }) =>
      updateProductFeatures(productId, features),
    onSuccess: () => {
      message.success('功能点更新成功');
      setFeatureModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
      sortOrder: record.sortOrder,
    });
    setModalOpen(true);
  };

  const openFeatureModal = async (record: Product) => {
    setSelectedProduct(record);
    try {
      const productFeatures = await getProductFeatures(record.id);
      const featureMap: Record<string, { enabled: boolean; required: boolean; configValue?: string }> = {};
      (productFeatures || []).forEach((pf: ProductFeature) => {
        featureMap[pf.featureId] = {
          enabled: pf.isEnabled,
          required: pf.isRequired,
          configValue: pf.configValue,
        };
      });
      setSelectedFeatures(featureMap);
    } catch {
      setSelectedFeatures({});
    }
    setFeatureModalOpen(true);
  };

  const openDetailDrawer = (record: Product) => {
    setDrawerProduct(record);
    setDrawerOpen(true);
  };

  // Wizard helpers
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
    // Validate current step
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
          setSuccessModalOpen(true);
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

  // When category changes in wizard, try to auto-select trigger from matching module
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
      // 确保 code 存在
      const dataToCreate = {
        ...values,
        code: values.code || values.name.toLowerCase().replace(/\s+/g, '_'),
      };
      createMutation.mutate(dataToCreate as any);
    }
  };

  const handleFeatureSave = () => {
    if (!selectedProduct) return;
    const allFeatures = extractArray<Feature>(featuresData);
    const features = allFeatures
      .filter((f: Feature) => selectedFeatures[f.id]?.enabled)
      .map((f: Feature) => ({
        featureId: f.id,
        isEnabled: true,
        isRequired: selectedFeatures[f.id]?.required || false,
        configValue: selectedFeatures[f.id]?.configValue,
      }));
    updateFeaturesMutation.mutate({ productId: selectedProduct.id, features });
  };

  const getCategoryConfig = (category: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === category) || { label: category, color: 'default' };

  const products = productsData?.records || (Array.isArray(productsData) ? productsData : []);
  const total = productsData?.total || products.length;
  const allFeatures = extractArray<Feature>(featuresData);

  // Batch-fetch package associations when products list loads
  const loadProductPackages = async (productIds: string[]) => {
    const newMap: Record<string, { id: string; code: string; name: string }[]> = {};
    await Promise.all(productIds.map(async (pid) => {
      try {
        const res = await getProductPackages(pid);
        const pkgs = Array.isArray(res) ? res : [];
        if (pkgs.length > 0) newMap[pid] = pkgs;
      } catch { /* ignore — column falls back to "—" */ }
    }));
    setProductPackagesMap((prev) => ({ ...prev, ...newMap }));
  };

  React.useEffect(() => {
    if (products.length > 0) {
      const idsToFetch = products
        .map((p: Product) => p.id)
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
      render: (_: unknown, record: Product) => {
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
      width: 280,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetailDrawer(record)}>
            详情
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openFeatureModal(record)}>
            配置功能
          </Button>
          <Popconfirm
            title="确认删除该产品？"
            description="删除后不可恢复，请谨慎操作"
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>产品管理</h2>
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
        locale={{ emptyText: <Empty description="暂无产品数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
        }}
      />

      {/* Product Creation Wizard */}
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
          message="本向导基于已注册的产品模块配置产品实例"
          description="如需全新产品类型，请联系开发团队扩展积木组件库。"
          style={{ marginBottom: 16 }}
        />
        <Steps
          current={wizardStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: '基本信息' },
            { title: '选择触发器' },
            { title: '组装规则链' },
            { title: '选择功能点' },
          ]}
        />

        {/* Step 0: Basic Info */}
        {wizardStep === 0 && (
          <Form layout="vertical">
            <Form.Item label="产品编码" required>
              <Input
                placeholder="如: stairs_basic"
                value={wizardData.code}
                onChange={(e) => setWizardData((prev) => ({ ...prev, code: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label="产品名称" required>
              <Input
                placeholder="请输入产品名称"
                value={wizardData.name}
                onChange={(e) => setWizardData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Form.Item>
            <Form.Item label="产品分类" required>
              <Select
                placeholder="请选择产品分类"
                value={wizardData.category || undefined}
                onChange={handleWizardCategoryChange}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea
                rows={3}
                placeholder="描述（选填）"
                value={wizardData.description}
                onChange={(e) => setWizardData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </Form.Item>
          </Form>
        )}

        {/* Step 1: Select Trigger */}
        {wizardStep === 1 && (
          <div>
            <Alert
              type="info"
              message="选择触发器"
              description="触发器决定了用户如何产生积分事件。每种产品类型对应特定的触发器。"
              style={{ marginBottom: 16 }}
              showIcon
            />
            <div style={{ display: 'grid', gap: 12 }}>
              {wizardModules.map((module) => {
                const isSelected = wizardData.triggerType === module.triggerType;
                return (
                  <GlassCard
                    key={module.code}
                    size="small"
                    hoverable
                    style={{
                      border: isSelected ? '2px solid #6366F1' : '1px solid rgba(0, 0, 0, 0.06)',
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
                        <Space>
                          <Text strong>{module.trigger?.name || module.triggerType}</Text>
                          <Tag color="geekblue">{module.name}</Tag>
                        </Space>
                        <div style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
                          {module.trigger?.description || `触发类型: ${module.triggerType}`}
                        </div>
                      </div>
                      {isSelected && <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 20 }} />}
                    </div>
                  </GlassCard>
                );
              })}
              {wizardModules.length === 0 && (
                <Empty description="暂无可用的触发器" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
            <Alert
              type="info"
              showIcon
              message={EXTENSION_GUIDANCE.title}
              description={EXTENSION_GUIDANCE.description}
              style={{ marginTop: 16 }}
            />
          </div>
        )}

        {/* Step 2: Assemble Rule Chain */}
        {wizardStep === 2 && (
          <div>
            <Alert
              type="info"
              message="组装规则链"
              description="规则链决定了积分计算的流程。可以调整执行顺序，或从可用节点中添加/移除节点。"
              style={{ marginBottom: 16 }}
              showIcon
            />
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Current rule chain */}
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 12 }}>当前规则链</h4>
                {wizardData.ruleChain.length === 0 ? (
                  <Empty description="规则链为空" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div>
                    {wizardData.ruleChain.map((nodeName, index) => {
                      const hasConfig = !!wizardData.ruleChainConfigs[`${nodeName}-${index}`];
                      return (
                        <div
                          key={`${nodeName}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            marginBottom: 4,
                            background: hasConfig ? '#f6ffed' : '#fafafa',
                            borderRadius: 6,
                            border: hasConfig ? '1px solid #b7eb8f' : '1px solid rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <HolderOutlined style={{ color: '#94A3B8', marginRight: 8, cursor: 'grab' }} />
                          <Badge count={index + 1} style={{ backgroundColor: '#722ed1', marginRight: 8 }} />
                          <Tag color="purple" style={{ flex: 1 }}>
                            {RULE_NODE_LABELS[nodeName] || nodeName}
                          </Tag>
                          {hasConfig && <Tag color="green">已配置</Tag>}
                          <Space size={2}>
                            <Button
                              type="text"
                              size="small"
                              icon={<SettingOutlined />}
                              onClick={() => openRuleNodeConfig(nodeName, index)}
                            >
                              配置
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              icon={<ArrowUpOutlined />}
                              disabled={index === 0}
                              onClick={() => moveRuleChainItem(index, 'up')}
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<ArrowDownOutlined />}
                              disabled={index === wizardData.ruleChain.length - 1}
                              onClick={() => moveRuleChainItem(index, 'down')}
                            />
                            <Button
                              type="text"
                              size="small"
                              danger
                              onClick={() => {
                                setWizardData((prev) => {
                                  const newChain = prev.ruleChain.filter((_, i) => i !== index);
                                  const newConfigs = { ...prev.ruleChainConfigs };
                                  delete newConfigs[`${nodeName}-${index}`];
                                  return {
                                    ...prev,
                                    ruleChain: newChain,
                                    ruleChainConfigs: newConfigs,
                                  };
                                });
                              }}
                            >
                              移除
                            </Button>
                          </Space>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available rule nodes */}
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 12 }}>可用规则节点</h4>
                {wizardRuleNodes
                  .filter((node) => !wizardData.ruleChain.includes(node.name))
                  .map((node) => (
                    <div
                      key={node.name}
                      style={{
                        padding: '8px 12px',
                        marginBottom: 4,
                        background: '#fff',
                        borderRadius: 6,
                        border: '1px dashed #d9d9d9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Tag color="purple">{RULE_NODE_LABELS[node.name] || node.name}</Tag>
                        <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{node.description}</div>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setWizardData((prev) => ({
                            ...prev,
                            ruleChain: [...prev.ruleChain, node.name],
                          }));
                        }}
                      >
                        添加
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
            <Alert
              type="info"
              showIcon
              message={EXTENSION_GUIDANCE.title}
              description={EXTENSION_GUIDANCE.description}
              style={{ marginTop: 12 }}
            />
          </div>
        )}

        {/* Step 3: Select Features */}
        {wizardStep === 3 && (
          <div>
            <Alert
              type="info"
              message="选择功能点"
              description="功能点是产品的可选附加能力。启用后，企业管理后台会显示对应的配置菜单。"
              style={{ marginBottom: 16 }}
              showIcon
            />
            {wizardFeatures.length === 0 ? (
              <Empty description="暂无可用功能点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              wizardFeatures.map((feature) => {
                const isSelected = wizardData.features.includes(feature.type);
                return (
                  <div
                    key={feature.type}
                    style={{
                      padding: '12px 16px',
                      marginBottom: 8,
                      background: isSelected ? '#f6ffed' : '#fafafa',
                      borderRadius: 6,
                      border: isSelected ? '1px solid #b7eb8f' : '1px solid rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setWizardData((prev) => ({
                        ...prev,
                        features: isSelected
                          ? prev.features.filter((f) => f !== feature.type)
                          : [...prev.features, feature.type],
                      }));
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Checkbox checked={isSelected} />
                        <Text strong>{FEATURE_LABELS[feature.type] || feature.name}</Text>
                        <Tag color="orange">{feature.type}</Tag>
                        {feature.required && <Tag color="red">必需</Tag>}
                      </Space>
                      {isSelected && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    </div>
                  </div>
                );
              })
            )}
            <Alert
              type="info"
              showIcon
              message={EXTENSION_GUIDANCE.title}
              description={EXTENSION_GUIDANCE.description}
              style={{ marginTop: 16 }}
            />
          </div>
        )}

        {/* Wizard footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button
            onClick={() => setWizardStep(wizardStep - 1)}
            disabled={wizardStep === 0}
          >
            上一步
          </Button>
          <Space>
            <Button onClick={() => setWizardOpen(false)}>取消</Button>
            {wizardStep < 3 ? (
              <Button type="primary" onClick={handleWizardNext}>
                下一步
              </Button>
            ) : (
              <Button type="primary" onClick={handleWizardFinish} loading={createMutation.isPending}>
                确认创建
              </Button>
            )}
          </Space>
        </div>
      </Modal>

      {/* Quick Create/Edit Product Modal */}
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
              <Form.Item
                name="category"
                label="产品分类"
                rules={[{ required: true, message: '请选择产品分类' }]}
              >
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
                <Tag color={getCategoryConfig(editingProduct.category).color}>
                  {getCategoryConfig(editingProduct.category).label}
                </Tag>
              </Form.Item>
            </>
          )}
          <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述（选填）" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? 1 : 0}
            getValueProps={(value) => ({ checked: value === 1 })}
            initialValue={1}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingProduct ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Product Detail Drawer */}
      <Drawer
        title={`产品详情 - ${drawerProduct?.name}`}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerProduct(null); }}
        width={560}
        destroyOnHidden
      >
        {drawerProduct && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="产品编码">{drawerProduct.code}</Descriptions.Item>
              <Descriptions.Item label="产品名称">{drawerProduct.name}</Descriptions.Item>
              <Descriptions.Item label="触发类型">
                {(() => {
                  const trigger = TRIGGER_TYPE_MAP[drawerProduct.category];
                  return trigger ? (
                    <Tag color={trigger.color}>{trigger.label}</Tag>
                  ) : (
                    <Tag>{drawerProduct.category}</Tag>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={drawerProduct.status === 1 ? 'green' : 'default'}>
                  {drawerProduct.status === 1 ? '启用' : '禁用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="描述">{drawerProduct.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="排序">{drawerProduct.sortOrder}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {drawerProduct.createTime ? dayjs(drawerProduct.createTime).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginBottom: 12 }}>规则链预览</h4>
            <Timeline
              style={{ marginBottom: 24, marginTop: 8 }}
              items={(() => {
                const matchedModule = wizardModules.find((m) => {
                  const codeMap: Record<string, string> = {
                    stairs_climbing: 'stair_climbing',
                    walking: 'walking',
                  };
                  return m.code === codeMap[drawerProduct.category];
                });
                const chain = matchedModule?.ruleChain || [];
                if (chain.length === 0) {
                  return [
                    { color: 'gray', children: '暂无规则链数据' },
                  ];
                }
                return chain.map((node, i) => ({
                  color: i === 0 ? 'blue' : 'gray',
                  children: (
                    <Space>
                      <Tag color="purple">{node}</Tag>
                      <span style={{ color: '#475569', fontSize: 12 }}>
                        {RULE_NODE_LABELS[node] || ''}
                      </span>
                    </Space>
                  ),
                }));
              })()}
            />

            <h4 style={{ marginBottom: 12 }}>功能点列表</h4>
            {drawerFeaturesLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>加载中...</div>
            ) : (() => {
              const features = drawerProductFeatures || [];
              if (features.length === 0) {
                return <Empty description="暂无功能点配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
              }
              return (
                <div>
                  {features.map((pf: ProductFeature) => (
                    <div
                      key={pf.featureId}
                      style={{
                        padding: '8px 12px',
                        marginBottom: 8,
                        background: '#F8FAFC',
                        borderRadius: 6,
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <strong>{pf.feature?.name || pf.featureId}</strong>
                          <Tag color={pf.feature?.type === 'permission' ? 'blue' : 'orange'}>
                            {pf.feature?.type === 'permission' ? '权限' : '配置'}
                          </Tag>
                        </Space>
                        <Space>
                          {pf.isRequired && <Tag color="red">必需</Tag>}
                          {!pf.isRequired && <Tag color="default">可选</Tag>}
                          {pf.isEnabled ? (
                            <Tag color="green">已启用</Tag>
                          ) : (
                            <Tag color="default">未启用</Tag>
                          )}
                        </Space>
                      </Space>
                      {pf.feature?.description && (
                        <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>{pf.feature.description}</div>
                      )}
                      {pf.configValue && (
                        <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>
                          配置值: <Tag>{pf.configValue}</Tag>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </Drawer>

      {/* Success Modal */}
      <Modal
        title="产品创建成功"
        open={successModalOpen}
        onCancel={() => setSuccessModalOpen(false)}
        footer={null}
        width={520}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
          <Title level={4} style={{ marginBottom: 8 }}>产品创建成功！</Title>
          <Text type="secondary">
            您可以继续以下操作：
          </Text>
        </div>
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Button
            type="primary"
            block
            icon={<EyeOutlined />}
            onClick={() => {
              setSuccessModalOpen(false);
              // In a real implementation, we would open the detail drawer for the created product
              message.info('查看产品详情功能即将上线');
            }}
          >
            查看产品详情
          </Button>
          <Button
            block
            icon={<SettingOutlined />}
            onClick={() => {
              setSuccessModalOpen(false);
              message.info('前往套餐管理功能即将上线');
            }}
          >
            去套餐管理，将产品加入套餐
          </Button>
          <Button
            block
            icon={<PlusOutlined />}
            onClick={() => {
              setSuccessModalOpen(false);
              openWizard();
            }}
          >
            继续创建新产品
          </Button>
        </Space>
      </Modal>

      {/* Rule Node Config Modal */}
      <RuleNodeConfigModal
        open={ruleNodeConfigModalOpen}
        nodeName={configuringRuleNode}
        initialConfig={
          configuringRuleNodeIndex >= 0
            ? wizardData.ruleChainConfigs[`${configuringRuleNode}-${configuringRuleNodeIndex}`]
            : undefined
        }
        onCancel={() => {
          setRuleNodeConfigModalOpen(false);
          setConfiguringRuleNode('');
          setConfiguringRuleNodeIndex(-1);
        }}
        onSave={handleRuleNodeConfigSave}
      />

      {/* Feature Configuration Modal */}
      <Modal
        title={`配置功能点 - ${selectedProduct?.name}`}
        open={featureModalOpen}
        onCancel={() => { setFeatureModalOpen(false); setSelectedProduct(null); setSelectedFeatures({}); }}
        onOk={handleFeatureSave}
        confirmLoading={updateFeaturesMutation.isPending}
        width={800}
        destroyOnHidden
      >
        <GlassCard size="small" type="inner" title="功能点列表" style={{ marginBottom: 0 }}>
          {allFeatures.length === 0 ? (
            <Empty description="暂无可配置的功能点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            allFeatures.map((feature: Feature) => (
              <div key={feature.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Checkbox
                      checked={selectedFeatures[feature.id]?.enabled}
                      onChange={(e) => setSelectedFeatures((prev) => ({
                        ...prev,
                        [feature.id]: { ...prev[feature.id], enabled: e.target.checked },
                      }))}
                    >
                      <strong>{feature.name}</strong>
                      <Tag color={feature.type === 'permission' ? 'blue' : 'orange'} style={{ marginLeft: 4 }}>
                        {feature.type === 'permission' ? '权限' : '配置'}
                      </Tag>
                      {feature.group && <Tag>{feature.group}</Tag>}
                    </Checkbox>
                  </Space>
                  {selectedFeatures[feature.id]?.enabled && (
                    <Space>
                      {feature.type === 'permission' && (
                        <Checkbox
                          checked={selectedFeatures[feature.id]?.required}
                          onChange={(e) => setSelectedFeatures((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], required: e.target.checked },
                          }))}
                        >
                          必需
                        </Checkbox>
                      )}
                      {feature.type === 'config' && (
                        <Input
                          placeholder="配置值"
                          value={selectedFeatures[feature.id]?.configValue || ''}
                          onChange={(e) => setSelectedFeatures((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], configValue: e.target.value },
                          }))}
                          style={{ width: 200 }}
                        />
                      )}
                    </Space>
                  )}
                </Space>
                {feature.description && (
                  <div style={{ marginLeft: 24, marginTop: 4, color: '#475569', fontSize: 13 }}>{feature.description}</div>
                )}
              </div>
            ))
          )}
        </GlassCard>
      </Modal>
    </div>
  );
};

export default ProductManagement;
