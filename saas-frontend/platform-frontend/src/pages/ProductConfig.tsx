import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Tag,
  Table,
  Modal,
  Select,
  TimePicker,
  Popconfirm,
  Empty,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getProduct,
  updateProduct,
  getBasicConfig,
  updateBasicConfig,
  getRuleTemplates,
  createRuleTemplate,
  updateRuleTemplate,
  deleteRuleTemplate,
  getProductFeatures,
  updateProductFeatures,
  getFeatures,
  Product,
  RuleTemplate,
  ProductFeature,
  Feature,
} from '@/api/platform';
import { extractArray } from '@/utils';

const CATEGORY_OPTIONS: Record<string, { label: string; color: string }> = {
  stairs_climbing: { label: '爬楼积分', color: 'blue' },
  walking: { label: '走路积分', color: 'green' },
};

const RULE_TYPE_OPTIONS = [
  { value: 'time_slot', label: '时段规则' },
  { value: 'random_base', label: '随机基数' },
  { value: 'special_date', label: '特殊日期倍率' },
  { value: 'level_coefficient', label: '等级系数' },
  { value: 'daily_cap', label: '每日上限' },
  { value: 'consecutive_reward', label: '连续奖励' },
];

const ProductConfig: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [basicInfoForm] = Form.useForm();
  const [basicConfigForm] = Form.useForm();
  const [ruleTemplateForm] = Form.useForm();

  const [activeTab, setActiveTab] = useState('basicInfo');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleTemplate | null>(null);
  const [featureStates, setFeatureStates] = useState<Record<string, { isEnabled: boolean; configValue?: string }>>({});

  // Fetch product
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId!),
    enabled: !!productId,
    retry: false,
  });

  // Fetch basic config
  const { data: basicConfigData, isLoading: basicConfigLoading } = useQuery({
    queryKey: ['basic-config', productId],
    queryFn: () => getBasicConfig(productId!),
    enabled: !!productId && activeTab === 'basicConfig',
    retry: false,
  });

  // Fetch rule templates
  const { data: ruleTemplatesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['rule-templates', productId],
    queryFn: () => getRuleTemplates(productId!),
    enabled: !!productId && activeTab === 'ruleTemplates',
    retry: false,
  });

  // Fetch product features
  const { data: productFeaturesData, isLoading: productFeaturesLoading } = useQuery({
    queryKey: ['product-features-config', productId],
    queryFn: () => getProductFeatures(productId!),
    enabled: !!productId && activeTab === 'featureConfig',
    retry: false,
  });

  // Fetch all features
  const { data: allFeaturesData } = useQuery({
    queryKey: ['all-features-config'],
    queryFn: () => getFeatures({ size: 500 }),
    enabled: activeTab === 'featureConfig',
    retry: false,
  });

  // Populate basic info form when product loads
  useEffect(() => {
    if (product) {
      basicInfoForm.setFieldsValue({
        name: product.name,
        description: product.description || '',
        status: product.status === 1,
        sortOrder: product.sortOrder,
      });
    }
  }, [product, basicInfoForm]);

  // Populate basic config form when data loads
  useEffect(() => {
    if (basicConfigData && product) {
      try {
        const raw = typeof basicConfigData === 'string' ? basicConfigData : JSON.stringify(basicConfigData);
        const parsed = JSON.parse(raw);
        basicConfigForm.setFieldsValue(parsed);
      } catch {
        basicConfigForm.resetFields();
      }
    }
  }, [basicConfigData, basicConfigForm, product]);

  // Populate feature states when product features load
  useEffect(() => {
    if (productFeaturesData) {
      const features = extractArray<ProductFeature>(productFeaturesData);
      const states: Record<string, { isEnabled: boolean; configValue?: string }> = {};
      features.forEach((pf) => {
        states[pf.featureId] = {
          isEnabled: pf.isEnabled,
          configValue: pf.configValue,
        };
      });
      setFeatureStates(states);
    }
  }, [productFeaturesData]);

  // Mutations
  const updateProductMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; status?: number; sortOrder?: number }) =>
      updateProduct(productId!, data),
    onSuccess: () => {
      message.success('基本信息已保存');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '保存失败');
    },
  });

  const updateBasicConfigMutation = useMutation({
    mutationFn: (config: string) => updateBasicConfig(productId!, config),
    onSuccess: () => {
      message.success('基础配置已保存');
      queryClient.invalidateQueries({ queryKey: ['basic-config', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '保存失败');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: any) => createRuleTemplate(productId!, data),
    onSuccess: () => {
      message.success('规则模板已创建');
      setRuleModalOpen(false);
      setEditingRule(null);
      ruleTemplateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['rule-templates', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      updateRuleTemplate(productId!, templateId, data),
    onSuccess: () => {
      message.success('规则模板已更新');
      setRuleModalOpen(false);
      setEditingRule(null);
      ruleTemplateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['rule-templates', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (templateId: string) => deleteRuleTemplate(productId!, templateId),
    onSuccess: () => {
      message.success('规则模板已删除');
      queryClient.invalidateQueries({ queryKey: ['rule-templates', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: (features: { featureId: string; configValue?: string; isRequired: boolean; isEnabled: boolean }[]) =>
      updateProductFeatures(productId!, features),
    onSuccess: () => {
      message.success('功能配置已保存');
      queryClient.invalidateQueries({ queryKey: ['product-features-config', productId] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '保存失败');
    },
  });

  // Handlers
  const handleBasicInfoSave = () => {
    basicInfoForm.validateFields().then((values) => {
      updateProductMutation.mutate({
        name: values.name,
        description: values.description,
        status: values.status ? 1 : 0,
        sortOrder: values.sortOrder,
      });
    });
  };

  const handleBasicConfigSave = () => {
    basicConfigForm.validateFields().then((values) => {
      updateBasicConfigMutation.mutate(JSON.stringify(values));
    });
  };

  const openCreateRuleModal = () => {
    setEditingRule(null);
    ruleTemplateForm.resetFields();
    ruleTemplateForm.setFieldsValue({ enabled: true, sortOrder: 0 });
    setRuleModalOpen(true);
  };

  const openEditRuleModal = (record: RuleTemplate) => {
    setEditingRule(record);
    ruleTemplateForm.setFieldsValue({
      ruleType: record.ruleType,
      name: record.name,
      config: record.config,
      enabled: record.enabled,
      sortOrder: record.sortOrder,
      description: record.description,
    });
    setRuleModalOpen(true);
  };

  const handleRuleModalOk = () => {
    ruleTemplateForm.validateFields().then((values) => {
      if (editingRule) {
        updateRuleMutation.mutate({ templateId: editingRule.id, data: values });
      } else {
        createRuleMutation.mutate(values);
      }
    });
  };

  const handleFeatureSave = () => {
    const allFeatures = extractArray<Feature>(allFeaturesData);
    const features = allFeatures
      .map((f: Feature) => ({
        featureId: f.id,
        isEnabled: featureStates[f.id]?.isEnabled || false,
        isRequired: false,
        configValue: featureStates[f.id]?.configValue,
      }));
    updateFeaturesMutation.mutate(features);
  };

  // Render helpers
  const renderStairsClimbingFields = () => (
    <>
      <Form.Item name="points_per_floor" label="每层积分" rules={[{ required: true, message: '请输入每层积分' }]}>
        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="如: 10" />
      </Form.Item>
      <Form.Item name="daily_cap" label="每日上限" rules={[{ required: true, message: '请输入每日上限' }]}>
        <InputNumber min={0} style={{ width: '100%' }} placeholder="如: 500" />
      </Form.Item>
      <Form.Item name="level_coefficient_enabled" label="启用等级系数" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="checkin_window_start" label="打卡开始时间">
        <TimePicker format="HH:mm" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="checkin_window_end" label="打卡结束时间">
        <TimePicker format="HH:mm" style={{ width: '100%' }} />
      </Form.Item>
    </>
  );

  const renderWalkingFields = () => (
    <>
      <Form.Item name="points_per_step" label="每步积分" rules={[{ required: true, message: '请输入每步积分' }]}>
        <InputNumber min={0} precision={4} style={{ width: '100%' }} placeholder="如: 0.01" />
      </Form.Item>
      <Form.Item name="daily_cap" label="每日上限" rules={[{ required: true, message: '请输入每日上限' }]}>
        <InputNumber min={0} style={{ width: '100%' }} placeholder="如: 300" />
      </Form.Item>
      <Form.Item name="level_coefficient_enabled" label="启用等级系数" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="min_step_threshold" label="最低步数阈值">
        <InputNumber min={0} style={{ width: '100%' }} placeholder="如: 1000" />
      </Form.Item>
      <Form.Item name="step_formula" label="步数公式">
        <Input placeholder="如: steps * 0.01" />
      </Form.Item>
    </>
  );

  const ruleTemplates = extractArray<RuleTemplate>(ruleTemplatesData);

  const ruleColumns = [
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      width: 140,
      render: (ruleType: string) => {
        const opt = RULE_TYPE_OPTIONS.find((o) => o.value === ruleType);
        return <Tag color="purple">{opt?.label || ruleType}</Tag>;
      },
    },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '配置摘要',
      dataIndex: 'config',
      ellipsis: true,
      render: (config: string) => {
        try {
          const parsed = JSON.parse(config);
          const summary = Object.entries(parsed)
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(', ');
          return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{summary}</span>;
        } catch {
          return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{config}</span>;
        }
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 70 },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: RuleTemplate) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditRuleModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该规则模板？"
            onConfirm={() => deleteRuleMutation.mutate(record.id)}
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

  const allFeatures = extractArray<Feature>(allFeaturesData);

  if (productLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Empty description="产品不存在" />
        <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/features/products')}>
          返回产品列表
        </Button>
      </div>
    );
  }

  const categoryConfig = CATEGORY_OPTIONS[product.category] || { label: product.category, color: 'default' };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/features/products')}
          style={{ marginRight: 12 }}
        />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>
          产品配置
        </h2>
        <span style={{ margin: '0 12px', color: '#94A3B8' }}>/</span>
        <span style={{ color: '#475569' }}>{product.name}</span>
        <Tag color={categoryConfig.color} style={{ marginLeft: 8 }}>
          {categoryConfig.label}
        </Tag>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'basicInfo',
          label: '基本信息',
          children: (
            <div style={{ maxWidth: 600 }}>
              <Form form={basicInfoForm} layout="vertical">
                <Form.Item label="产品编码">
                  <Input value={product.code} disabled />
                </Form.Item>
                <Form.Item label="产品分类">
                  <Tag color={categoryConfig.color}>{categoryConfig.label}</Tag>
                </Form.Item>
                <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
                  <Input placeholder="请输入产品名称" />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea rows={3} placeholder="产品描述（选填）" />
                </Form.Item>
                <Form.Item name="status" label="状态" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>
                <Form.Item name="sortOrder" label="排序">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    onClick={handleBasicInfoSave}
                    loading={updateProductMutation.isPending}
                  >
                    保存
                  </Button>
                </Form.Item>
              </Form>
            </div>
          ),
        },
        {
          key: 'basicConfig',
          label: '基础配置',
          children: (
            <div style={{ maxWidth: 600 }}>
              {basicConfigLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : (
                <Form form={basicConfigForm} layout="vertical">
                  {product.category === 'stairs_climbing' && renderStairsClimbingFields()}
                  {product.category === 'walking' && renderWalkingFields()}
                  {!['stairs_climbing', 'walking'].includes(product.category) && (
                    <Empty description="该产品类型暂无基础配置项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                  {['stairs_climbing', 'walking'].includes(product.category) && (
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        onClick={handleBasicConfigSave}
                        loading={updateBasicConfigMutation.isPending}
                      >
                        保存
                      </Button>
                    </Form.Item>
                  )}
                </Form>
              )}
            </div>
          ),
        },
        {
          key: 'ruleTemplates',
          label: '规则模板',
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRuleModal}>
                  添加规则模板
                </Button>
              </div>
              {rulesLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : (
                <Table
                  columns={ruleColumns}
                  dataSource={ruleTemplates}
                  rowKey="id"
                  locale={{ emptyText: <Empty description="暂无规则模板" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  pagination={false}
                />
              )}
            </div>
          ),
        },
        {
          key: 'featureConfig',
          label: '功能配置',
          children: (
            <div>
              {productFeaturesLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : allFeatures.length === 0 ? (
                <Empty description="暂无可配置的功能" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <>
                  {allFeatures.map((feature: Feature) => {
                    const state = featureStates[feature.id];
                    const isEnabled = state?.isEnabled || false;
                    const configValue = state?.configValue || '';
                    return (
                      <div
                        key={feature.id}
                        style={{
                          padding: '12px 16px',
                          marginBottom: 8,
                          background: isEnabled ? '#f6ffed' : '#fafafa',
                          borderRadius: 6,
                          border: `1px solid ${isEnabled ? '#b7eb8f' : 'rgba(0, 0, 0, 0.06)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <Switch
                              size="small"
                              checked={isEnabled}
                              onChange={(checked) =>
                                setFeatureStates((prev) => ({
                                  ...prev,
                                  [feature.id]: { ...prev[feature.id], isEnabled: checked },
                                }))
                              }
                            />
                            <strong>{feature.name}</strong>
                            <Tag color={feature.type === 'permission' ? 'blue' : 'orange'}>
                              {feature.type === 'permission' ? '权限' : '配置'}
                            </Tag>
                            {feature.group && <Tag>{feature.group}</Tag>}
                          </Space>
                        </div>
                        {isEnabled && feature.type === 'config' && (
                          <div style={{ marginTop: 8, marginLeft: 48 }}>
                            <Input
                              placeholder="配置值"
                              value={configValue}
                              onChange={(e) =>
                                setFeatureStates((prev) => ({
                                  ...prev,
                                  [feature.id]: { ...prev[feature.id], configValue: e.target.value },
                                }))
                              }
                              style={{ maxWidth: 400 }}
                            />
                          </div>
                        )}
                        {feature.description && (
                          <div style={{ marginLeft: 48, marginTop: 4, color: '#94A3B8', fontSize: 12 }}>
                            {feature.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      onClick={handleFeatureSave}
                      loading={updateFeaturesMutation.isPending}
                    >
                      保存功能配置
                    </Button>
                  </div>
                </>
              )}
            </div>
          ),
        },
      ]} />

      {/* Rule Template Modal */}
      <Modal
        title={editingRule ? '编辑规则模板' : '添加规则模板'}
        open={ruleModalOpen}
        onCancel={() => { setRuleModalOpen(false); setEditingRule(null); ruleTemplateForm.resetFields(); }}
        onOk={handleRuleModalOk}
        confirmLoading={createRuleMutation.isPending || updateRuleMutation.isPending}
        width={600}
        destroyOnHidden
      >
        <Form form={ruleTemplateForm} layout="vertical">
          <Form.Item name="ruleType" label="规则类型" rules={[{ required: true, message: '请选择规则类型' }]}>
            <Select placeholder="请选择规则类型">
              {RULE_TYPE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入规则模板名称" />
          </Form.Item>
          <Form.Item name="config" label="配置" rules={[{ required: true, message: '请输入配置' }]}>
            <Input.TextArea
              rows={6}
              placeholder='{"key": "value"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="规则模板描述（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductConfig;
