import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tag,
  message,
  Popconfirm,
  Checkbox,
  Switch,
  Typography,
  Tooltip,
  Empty,
  Alert,
  Collapse,
  InputNumber,
  Select,
  Divider,
  Card,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { platformApiClient } from '@/api/request';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { PermissionPackage, Product, ProductFeature, PackageProduct } from '@/api/platform';
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getPackageDetail,
  updatePackageProducts,
  getProducts,
  getProductFeatures,
  updatePackageProductFeatures,
  getPackagePermissions,
} from '@/api/platform';
import { extractArray } from '@/utils';

const { Text } = Typography;

// ---------- Product feature definitions (UI catalog) ----------

interface ProductFeatureDef {
  code: string;
  name: string;
  description: string;
  required?: boolean;
  type: 'permission' | 'config';
  params?: {
    key: string;
    label: string;
    type: 'boolean' | 'number' | 'string' | 'multi-select';
    defaultValue?: unknown;
    min?: number;
    max?: number;
    options?: { label: string; value: string }[];
    placeholder?: string;
  }[];
}

interface ProductDef {
  code: string;
  name: string;
  color: string;
  category: string;
  features: ProductFeatureDef[];
}

const PRODUCT_CATALOG: ProductDef[] = [
  {
    code: 'stair_climbing',
    name: '爬楼积分',
    color: 'blue',
    category: 'stairs_climbing',
    features: [
      {
        code: 'time_slot',
        name: '时段配置',
        description: '设置每日打卡时段和最大时段数',
        required: true,
        type: 'config',
        params: [
          { key: 'max_time_slots', label: '最大时段数', type: 'number', defaultValue: 3, min: 1, max: 10, placeholder: '最大时段数' },
        ],
      },
      {
        code: 'floor_points',
        name: '楼层积分',
        description: '按楼层计算积分',
        type: 'config',
        params: [
          { key: 'points_per_floor', label: '每层积分', type: 'number', defaultValue: 10, min: 1, max: 100, placeholder: '每层积分数' },
        ],
      },
      {
        code: 'workday_only',
        name: '仅工作日',
        description: '限制仅工作日可打卡',
        type: 'config',
        params: [
          { key: 'enabled', label: '启用', type: 'boolean', defaultValue: false },
        ],
      },
      {
        code: 'special_date',
        name: '特殊日期',
        description: '特殊日期积分翻倍',
        type: 'config',
        params: [
          { key: 'max_special_dates', label: '最大特殊日期数', type: 'number', defaultValue: 5, min: 0, max: 50, placeholder: '最大特殊日期数' },
        ],
      },
      {
        code: 'leaderboard',
        name: '排行榜',
        description: '爬楼排行榜功能',
        type: 'permission',
        params: [
          {
            key: 'dimensions',
            label: '排行榜维度',
            type: 'multi-select',
            defaultValue: ['daily', 'weekly'],
            options: [
              { label: '日排行', value: 'daily' },
              { label: '周排行', value: 'weekly' },
              { label: '月排行', value: 'monthly' },
              { label: '总排行', value: 'all_time' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'walking',
    name: '走路积分',
    color: 'green',
    category: 'walking',
    features: [
      {
        code: 'daily_points',
        name: '每日步数积分',
        description: '按每日步数计算积分',
        required: true,
        type: 'config',
        params: [
          { key: 'points_per_1000_steps', label: '每千步积分', type: 'number', defaultValue: 5, min: 1, max: 100, placeholder: '每千步积分数' },
        ],
      },
      {
        code: 'step_tier',
        name: '阶梯奖励',
        description: '按步数阶梯奖励额外积分',
        type: 'config',
        params: [
          { key: 'max_tiers', label: '最大阶梯数', type: 'number', defaultValue: 3, min: 1, max: 10, placeholder: '阶梯数' },
        ],
      },
      {
        code: 'fun_conversion',
        name: '趣味换算',
        description: '将步数换算为趣味数据（如绕地球圈数）',
        type: 'config',
        params: [
          { key: 'max_items', label: '最大换算项数', type: 'number', defaultValue: 3, min: 1, max: 10, placeholder: '换算项数' },
        ],
      },
      {
        code: 'leaderboard',
        name: '排行榜',
        description: '走路排行榜功能',
        type: 'permission',
        params: [
          {
            key: 'dimensions',
            label: '排行榜维度',
            type: 'multi-select',
            defaultValue: ['daily', 'weekly'],
            options: [
              { label: '日排行', value: 'daily' },
              { label: '周排行', value: 'weekly' },
              { label: '月排行', value: 'monthly' },
              { label: '总排行', value: 'all_time' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'quiz',
    name: '知识问答',
    color: 'purple',
    category: 'quiz',
    features: [
      {
        code: 'enabled',
        name: '启用问答',
        description: '开启知识问答功能',
        required: true,
        type: 'config',
        params: [
          { key: 'value', label: '启用', type: 'boolean', defaultValue: true },
        ],
      },
      {
        code: 'question_types',
        name: '题型支持',
        description: '支持的题目类型',
        type: 'config',
        params: [
          {
            key: 'types',
            label: '题目类型',
            type: 'multi-select',
            defaultValue: ['single_choice', 'true_false'],
            options: [
              { label: '单选题', value: 'single_choice' },
              { label: '判断题', value: 'true_false' },
              { label: '多选题', value: 'multi_choice' },
            ],
          },
        ],
      },
      {
        code: 'daily_limit',
        name: '每日限制',
        description: '每日答题次数上限',
        type: 'config',
        params: [
          { key: 'max_daily', label: '每日最大答题数', type: 'number', defaultValue: 5, min: 1, max: 50, placeholder: '每日上限' },
        ],
      },
      {
        code: 'analysis',
        name: '答题分析',
        description: '答题后展示答案解析',
        type: 'permission',
        params: [
          { key: 'enabled', label: '启用', type: 'boolean', defaultValue: true },
        ],
      },
    ],
  },
  {
    code: 'mall',
    name: '积分商城',
    color: 'orange',
    category: 'mall',
    features: [
      {
        code: 'enabled',
        name: '启用商城',
        description: '开启积分商城功能',
        required: true,
        type: 'config',
        params: [
          { key: 'value', label: '启用', type: 'boolean', defaultValue: true },
        ],
      },
      {
        code: 'exchange_rate',
        name: '兑换比例',
        description: '积分兑换比例配置',
        type: 'config',
        params: [
          { key: 'allow_custom_rate', label: '允许自定义比例', type: 'boolean', defaultValue: false },
        ],
      },
      {
        code: 'platform_pool',
        name: '平台商品池',
        description: '平台共享商品池配置',
        type: 'config',
        params: [
          { key: 'max_products', label: '最大商品数', type: 'number', defaultValue: 50, min: 1, max: 500, placeholder: '商品上限' },
        ],
      },
      {
        code: 'reports',
        name: '兑换报表',
        description: '积分兑换统计报表',
        type: 'permission',
        params: [
          { key: 'enabled', label: '启用', type: 'boolean', defaultValue: true },
        ],
      },
    ],
  },
];

// ---------- Feature config state ----------

interface FeatureConfig {
  enabled: boolean;
  params: Record<string, unknown>;
}

interface ProductConfig {
  included: boolean;
  features: Record<string, FeatureConfig>;
}

type PackageFeaturesState = Record<string, ProductConfig>;

const buildDefaultFeatures = (catalog: ProductDef[]): PackageFeaturesState => {
  const state: PackageFeaturesState = {};
  for (const product of catalog) {
    const features: Record<string, FeatureConfig> = {};
    for (const feat of product.features) {
      const params: Record<string, unknown> = {};
      if (feat.params) {
        for (const p of feat.params) {
          params[p.key] = p.defaultValue;
        }
      }
      features[feat.code] = { enabled: true, params };
    }
    state[product.code] = { included: false, features };
  }
  return state;
};

// ---------- Param input renderer ----------

const renderParamInput = (
  paramDef: ProductFeatureDef['params']![0],
  value: unknown,
  onChange: (val: unknown) => void,
  disabled: boolean,
) => {
  switch (paramDef.type) {
    case 'boolean':
      return (
        <Switch
          size="small"
          checked={value === true || value === 'true'}
          onChange={(checked) => onChange(checked)}
          disabled={disabled}
          checkedChildren="开"
          unCheckedChildren="关"
        />
      );
    case 'number':
      return (
        <InputNumber
          size="small"
          min={paramDef.min}
          max={paramDef.max}
          value={typeof value === 'number' ? value : (paramDef.defaultValue as number)}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          placeholder={paramDef.placeholder}
          style={{ width: 130 }}
        />
      );
    case 'multi-select':
      return (
        <Select
          mode="multiple"
          size="small"
          value={(value as string[]) || (paramDef.defaultValue as string[]) || []}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          options={paramDef.options}
          placeholder={paramDef.placeholder}
          style={{ minWidth: 200 }}
        />
      );
    case 'string':
    default:
      return (
        <Input
          size="small"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={paramDef.placeholder || (paramDef.defaultValue as string) || ''}
          style={{ width: 200 }}
        />
      );
  }
};

// ---------- Main component ----------

const PackageManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<'create' | 'edit'>('create');
  const [editingPackage, setEditingPackage] = useState<PermissionPackage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PermissionPackage | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [packageProductFeatures, setPackageProductFeatures] = useState<Record<string, Record<string, ProductFeature>>>({});
  const [productFeaturesLoading, setProductFeaturesLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  // New: features state for the integrated product/feature selector
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
  const [featuresPackage, setFeaturesPackage] = useState<PermissionPackage | null>(null);
  const [featuresState, setFeaturesState] = useState<PackageFeaturesState>(buildDefaultFeatures(PRODUCT_CATALOG));
  const [saveFeaturesLoading, setSaveFeaturesLoading] = useState(false);

  const { data: packagesData, isLoading, refetch } = useQuery({
    queryKey: ['packages', page, pageSize],
    queryFn: () => getPackages({ page, size: pageSize }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: productsData } = useQuery({
    queryKey: ['all-products-for-package'],
    queryFn: () => getProducts({ size: 100, status: 1 }),
    enabled: productModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createPackage,
    onSuccess: () => {
      message.success('套餐创建成功');
      setPackageModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; status?: number } }) =>
      updatePackage(id, data),
    onSuccess: () => {
      message.success('套餐更新成功');
      setPackageModalOpen(false);
      setEditingPackage(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePackage,
    onSuccess: () => {
      message.success('套餐已删除');
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const updateProductsMutation = useMutation({
    mutationFn: ({ packageId, products }: { packageId: string; products: { productId: string; sortOrder?: number }[] }) =>
      updatePackageProducts(packageId, products),
    onSuccess: () => {
      message.success('套餐产品更新成功');
      setProductModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const updateProductFeaturesMutation = useMutation({
    mutationFn: ({
      packageId, productId, features,
    }: { packageId: string; productId: string; features: { featureId: string; configValue?: string; isEnabled: boolean }[] }) =>
      updatePackageProductFeatures(packageId, productId, features),
    onSuccess: () => {
      message.success('功能点配置保存成功');
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '保存失败');
    },
  });

  const openCreateModal = () => {
    setPackageModalMode('create');
    setEditingPackage(null);
    form.resetFields();
    setPackageModalOpen(true);
  };

  const openEditModal = (record: PermissionPackage) => {
    setPackageModalMode('edit');
    setEditingPackage(record);
    form.setFieldsValue({ name: record.name, description: record.description });
    setPackageModalOpen(true);
  };

  const openProductModal = async (record: PermissionPackage) => {
    setSelectedPackage(record);
    setProductFeaturesLoading(true);
    try {
      const detail = await getPackageDetail(record.id);
      const packageProducts = detail?.products || [];
      const newSelectedProducts = packageProducts.map((p: PackageProduct) => p.productId);
      setSelectedProducts(newSelectedProducts);

      const featureMap: Record<string, Record<string, ProductFeature>> = {};
      for (const pkgProduct of packageProducts) {
        if (!pkgProduct.productId) continue;
        try {
          const featuresData = await getProductFeatures(pkgProduct.productId);
          const productFeatures: ProductFeature[] = featuresData || [];
          const pkgFeatures = pkgProduct.features || [];

          featureMap[pkgProduct.productId] = {};
          productFeatures.forEach((pf: ProductFeature) => {
            const pkgF = pkgFeatures.find(f => f.featureId === pf.featureId);
            featureMap[pkgProduct.productId][pf.featureId] = {
              ...pf,
              isEnabled: pkgF ? pkgF.isEnabled : pf.isEnabled,
              configValue: pkgF ? (pkgF.configValue ?? pf.configValue) : pf.configValue,
            };
          });

          pkgFeatures.forEach(pkgF => {
            if (!featureMap[pkgProduct.productId][pkgF.featureId]) {
              featureMap[pkgProduct.productId][pkgF.featureId] = {
                id: '',
                productId: pkgProduct.productId,
                featureId: pkgF.featureId,
                featureCode: pkgF.featureCode,
                featureName: pkgF.featureName,
                featureType: pkgF.featureType,
                valueType: pkgF.valueType,
                defaultValue: pkgF.productDefaultValue,
                configValue: pkgF.configValue,
                isRequired: false,
                isEnabled: pkgF.isEnabled,
              };
            }
          });
        } catch {
          // ignore individual product errors
        }
      }
      setPackageProductFeatures(featureMap);
      setExpandedProducts(newSelectedProducts);
    } catch {
      setSelectedProducts([]);
      setPackageProductFeatures({});
      setExpandedProducts([]);
    } finally {
      setProductFeaturesLoading(false);
    }
    setProductModalOpen(true);
  };

  // Open the new features selector modal
  const openFeaturesModal = async (record: PermissionPackage) => {
    setFeaturesPackage(record);
    setFeaturesModalOpen(true);

    // Try to load existing feature config from backend
    const defaultState = buildDefaultFeatures(PRODUCT_CATALOG);
    try {
      const detail = await getPackageDetail(record.id);
      const packageProducts = detail?.products || [];

      // Map backend products to catalog codes
      for (const pkgProduct of packageProducts) {
        const catalogProduct = PRODUCT_CATALOG.find(
          (c) => c.category === pkgProduct.productCategory || c.code === pkgProduct.productCode
        );
        if (!catalogProduct) continue;

        defaultState[catalogProduct.code].included = true;

        // Override with persisted feature settings
        if (pkgProduct.features) {
          for (const pf of pkgProduct.features) {
            const featDef = catalogProduct.features.find((f) => f.code === pf.featureCode);
            if (featDef) {
              const existing = defaultState[catalogProduct.code].features[featDef.code];
              if (existing) {
                existing.enabled = pf.isEnabled;
                // Parse configValue into params if available
                if (pf.configValue) {
                  try {
                    const parsed = JSON.parse(pf.configValue);
                    if (typeof parsed === 'object' && parsed !== null) {
                      existing.params = { ...existing.params, ...parsed };
                    } else {
                      // Single value - set the first param
                      const firstParamKey = featDef.params?.[0]?.key;
                      if (firstParamKey) existing.params[firstParamKey] = parsed;
                    }
                  } catch {
                    // Not JSON - set first param as string
                    const firstParamKey = featDef.params?.[0]?.key;
                    if (firstParamKey) existing.params[firstParamKey] = pf.configValue;
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Use defaults if API fails
    }

    setFeaturesState(defaultState);
  };

  const handleFormFinish = (values: { code?: string; name: string; description?: string }) => {
    if (packageModalMode === 'create') {
      createMutation.mutate({ code: values.code || `PKG_${Date.now()}`, name: values.name, description: values.description, permissionCodes: [] });
    } else if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: values });
    }
  };

  const handleProductSave = () => {
    if (selectedPackage) {
      updateProductsMutation.mutate({
        packageId: selectedPackage.id,
        products: selectedProducts.map((productId, index) => ({ productId, sortOrder: index })),
      });
    }
  };

  const handleToggleStatus = (record: PermissionPackage) => {
    updateMutation.mutate({
      id: record.id,
      data: { name: record.name, description: record.description, status: (record.status === true || record.status === 1) ? 0 : 1 },
    });
  };

  // Save features via PUT /api/platform/packages/{id}/features
  const handleSaveFeatures = async () => {
    if (!featuresPackage) return;
    setSaveFeaturesLoading(true);

    try {
      // Build the payload: only included products and their features
      const payload: {
        products: {
          productCode: string;
          features: { featureCode: string; isEnabled: boolean; configValue?: string }[];
        }[];
      } = { products: [] };

      for (const product of PRODUCT_CATALOG) {
        const config = featuresState[product.code];
        if (!config?.included) continue;

        const features: { featureCode: string; isEnabled: boolean; configValue?: string }[] = [];
        for (const featDef of product.features) {
          const featConfig = config.features[featDef.code];
          if (!featConfig) continue;

          let configValue: string | undefined;
          if (featConfig.params && Object.keys(featConfig.params).length > 0) {
            // If there's a single param with a simple value, store it directly
            const paramKeys = Object.keys(featConfig.params);
            if (paramKeys.length === 1 && featDef.params && featDef.params.length === 1) {
              const val = featConfig.params[paramKeys[0]];
              configValue = String(val);
            } else {
              configValue = JSON.stringify(featConfig.params);
            }
          }

          features.push({
            featureCode: featDef.code,
            isEnabled: featConfig.enabled,
            configValue,
          });
        }

        payload.products.push({ productCode: product.code, features });
      }

      // PUT /api/platform/packages/{id}/features
      await platformApiClient.put(`/packages/${featuresPackage.id}/features`, payload);

      message.success('产品功能配置保存成功');
      setFeaturesModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaveFeaturesLoading(false);
    }
  };

  const records = packagesData?.records || (Array.isArray(packagesData) ? packagesData : []);
  const total = packagesData?.total || records.length;
  const allProducts = productsData?.records || (Array.isArray(productsData) ? productsData : []);

  const columns = [
    { title: '套餐编码', dataIndex: 'code', width: 120, render: (v: string) => <Text code copyable>{v}</Text> },
    { title: '套餐名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (d: string) => d || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: number | boolean) => {
        const active = s === true || s === 1;
        return <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>;
      },
    },
    {
      title: '权限数',
      dataIndex: 'permissionCount',
      width: 80,
      render: (n: number) => <Tooltip title={`包含 ${n} 个功能点`}>{n ?? 0}</Tooltip>,
    },
    {
      title: '使用企业',
      dataIndex: 'tenantCount',
      width: 90,
      render: (n: number) => n ?? 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      width: 320,
      render: (_: unknown, record: PermissionPackage) => {
        const isActive = record.status === true || record.status === 1;
        return (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openProductModal(record)}>
            配置产品
          </Button>
          <Button type="link" size="small" icon={<AppstoreOutlined />} onClick={() => openFeaturesModal(record)}>
            产品功能
          </Button>
          <Popconfirm
            title={isActive ? '确认禁用该套餐？' : '确认启用该套餐？'}
            onConfirm={() => handleToggleStatus(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small">
              {isActive ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          {record.code !== 'free' && record.tenantCount === 0 && (
            <Popconfirm
              title="确认删除该套餐？"
              description="删除后不可恢复"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      );
      },
    },
  ];

  // Count included products and enabled features for display
  const getIncludedProductCount = (state: PackageFeaturesState) =>
    Object.values(state).filter((p) => p.included).length;

  const getEnabledFeatureCount = (state: PackageFeaturesState) =>
    Object.values(state).reduce(
      (acc, p) => acc + Object.values(p.features).filter((f) => f.enabled).length,
      0,
    );

  const getTotalFeatureCount = () =>
    PRODUCT_CATALOG.reduce((acc, p) => acc + p.features.length, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>套餐管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>创建套餐</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="暂无套餐数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
        }}
      />

      {/* Create/Edit Package Modal */}
      <Modal
        title={packageModalMode === 'create' ? '创建套餐' : '编辑套餐'}
        open={packageModalOpen}
        onCancel={() => { setPackageModalOpen(false); setEditingPackage(null); form.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          {packageModalMode === 'create' && (
            <Form.Item name="code" label="套餐编码" rules={[{ required: true, message: '请输入套餐编码' }]}>
              <Input placeholder="如: pro" />
            </Form.Item>
          )}
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="如: 专业版" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {packageModalMode === 'create' ? '确认创建' : '保存修改'}
              </Button>
              <Button onClick={() => { setPackageModalOpen(false); setEditingPackage(null); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Product Configuration Modal (existing) */}
      <Modal
        title={`配置产品 - ${selectedPackage?.name}`}
        open={productModalOpen}
        onCancel={() => {
          setProductModalOpen(false);
          setSelectedPackage(null);
          setSelectedProducts([]);
          setPackageProductFeatures({});
          setExpandedProducts([]);
        }}
        onOk={handleProductSave}
        confirmLoading={updateProductsMutation.isPending || productFeaturesLoading}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>选择产品</h4>
          {allProducts.length === 0 ? (
            <Empty description="暂无可用产品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space wrap>
              {allProducts.map((product: Product) => (
                <Checkbox
                  key={product.id}
                  checked={selectedProducts.includes(product.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProducts([...selectedProducts, product.id]);
                      setExpandedProducts([...expandedProducts, product.id]);
                    } else {
                      setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                      setExpandedProducts(expandedProducts.filter((id) => id !== product.id));
                      const newFeatures = { ...packageProductFeatures };
                      delete newFeatures[product.id];
                      setPackageProductFeatures(newFeatures);
                    }
                  }}
                >
                  {product.name}
                  <Tag color={product.category === 'stairs_climbing' ? 'blue' : 'green'} style={{ marginLeft: 4 }}>
                    {product.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
                  </Tag>
                </Checkbox>
              ))}
            </Space>
          )}
        </div>
        <Collapse
          activeKey={expandedProducts}
          onChange={(keys) => setExpandedProducts(keys as string[])}
          style={{ background: 'transparent' }}
          items={allProducts
            .filter((product: Product) => selectedProducts.includes(product.id))
            .map((product: Product) => {
              const features = packageProductFeatures[product.id] || {};
              const featureList = Object.values(features) as ProductFeature[];
              const enabledCount = featureList.filter((pf) => pf.isEnabled).length;

              return {
                key: product.id,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{product.name}</strong>
                    <Tag color={product.category === 'stairs_climbing' ? 'blue' : 'green'}>
                      {product.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#475569' }}>
                      {enabledCount}/{featureList.length} 功能点已启用
                    </span>
                  </div>
                ),
                children: (
                  <div>
                    <Alert
                      type="info"
                      showIcon
                      icon={<LockOutlined />}
                      message="必需功能点不可关闭，可选功能点可自由开关"
                      style={{ marginBottom: 8, padding: '4px 12px' }}
                      banner
                    />
                    {featureList.map((pf) => (
                      <div
                        key={pf.featureId}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px solid #f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Space>
                          <Switch
                            size="small"
                            checked={pf.isEnabled}
                            disabled={pf.isRequired}
                            onChange={(checked) => {
                              setPackageProductFeatures((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  [pf.featureId]: { ...pf, isEnabled: checked },
                                },
                              }));
                            }}
                          />
                          <Text strong>{pf.featureName || pf.featureId}</Text>
                          <Tag color={pf.featureType === 'permission' ? 'blue' : 'orange'}>
                            {pf.featureType === 'permission' ? '权限' : '配置'}
                          </Tag>
                          {pf.isRequired ? (
                            <Tag color="red" icon={<LockOutlined />}>必需</Tag>
                          ) : (
                            <Tag color="default">可选</Tag>
                          )}
                        </Space>
                        {pf.featureType === 'config' && pf.isEnabled && !pf.isRequired && (
                          <div style={{ minWidth: 160 }}>
                            {pf.valueType === 'boolean' ? (
                              <Switch
                                size="small"
                                checked={pf.configValue === 'true' || pf.configValue === '1'}
                                onChange={(checked) => {
                                  setPackageProductFeatures((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      [pf.featureId]: { ...pf, configValue: String(checked) },
                                    },
                                  }));
                                }}
                                checkedChildren="开"
                                unCheckedChildren="关"
                              />
                            ) : (
                              <Input
                                size="small"
                                value={pf.configValue || ''}
                                placeholder={pf.defaultValue || '配置值'}
                                onChange={(e) => {
                                  setPackageProductFeatures((prev) => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      [pf.featureId]: { ...pf, configValue: e.target.value },
                                    },
                                  }));
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      icon={<CheckCircleOutlined />}
                      onClick={() => {
                        if (!selectedPackage?.id) return;
                        const features = Object.values(packageProductFeatures[product.id] || {}).map((pf: ProductFeature) => ({
                          featureId: pf.featureId,
                          configValue: pf.configValue,
                          isEnabled: pf.isEnabled,
                        }));
                        updateProductFeaturesMutation.mutate({
                          packageId: selectedPackage.id,
                          productId: product.id,
                          features,
                        });
                      }}
                      loading={updateProductFeaturesMutation.isPending}
                    >
                      保存该产品功能点
                    </Button>
                  </div>
                ),
              };
            })
          }
        />
      </Modal>

      {/* Product & Features Selector Modal (new) */}
      <Modal
        title={
          <Space>
            <AppstoreOutlined />
            <span>产品功能配置 - {featuresPackage?.name}</span>
          </Space>
        }
        open={featuresModalOpen}
        onCancel={() => {
          setFeaturesModalOpen(false);
          setFeaturesPackage(null);
        }}
        width={860}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              已选择 {getIncludedProductCount(featuresState)} 个产品，
              {getEnabledFeatureCount(featuresState)}/{getTotalFeatureCount()} 个功能点已启用
            </Text>
            <Space>
              <Button onClick={() => { setFeaturesModalOpen(false); setFeaturesPackage(null); }}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={saveFeaturesLoading}
                onClick={handleSaveFeatures}
              >
                保存配置
              </Button>
            </Space>
          </div>
        }
      >
        <Alert
          type="info"
          showIcon
          message="选择该套餐包含的产品，并配置各产品的功能点开关和参数"
          style={{ marginBottom: 16 }}
        />

        {PRODUCT_CATALOG.map((product) => {
          const productConfig = featuresState[product.code];
          const isIncluded = productConfig?.included ?? false;
          const enabledCount = Object.values(productConfig?.features ?? {}).filter((f) => f.enabled).length;
          const totalFeatCount = product.features.length;

          return (
            <Card
              key={product.code}
              size="small"
              style={{
                marginBottom: 12,
                borderColor: isIncluded ? undefined : '#f0f0f0',
                opacity: isIncluded ? 1 : 0.75,
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Checkbox
                    checked={isIncluded}
                    onChange={(e) =>
                      setFeaturesState((prev) => ({
                        ...prev,
                        [product.code]: { ...prev[product.code], included: e.target.checked },
                      }))
                    }
                  />
                  <Text strong style={{ fontSize: 14 }}>{product.name}</Text>
                  <Tag color={product.color}>{product.category}</Tag>
                  {isIncluded && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {enabledCount}/{totalFeatCount} 功能点已启用
                    </Text>
                  )}
                </div>
              }
            >
              {isIncluded && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  {product.features.map((featDef) => {
                    const featConfig = productConfig?.features?.[featDef.code];
                    const isEnabled = featConfig?.enabled ?? true;
                    const params = featConfig?.params ?? {};

                    return (
                      <div
                        key={featDef.code}
                        style={{
                          padding: '8px 0',
                          borderBottom: '1px solid #fafafa',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Space size={6}>
                            <Switch
                              size="small"
                              checked={isEnabled}
                              disabled={featDef.required}
                              onChange={(checked) =>
                                setFeaturesState((prev) => ({
                                  ...prev,
                                  [product.code]: {
                                    ...prev[product.code],
                                    features: {
                                      ...prev[product.code].features,
                                      [featDef.code]: {
                                        ...prev[product.code].features[featDef.code],
                                        enabled: checked,
                                      },
                                    },
                                  },
                                }))
                              }
                            />
                            <Text>{featDef.name}</Text>
                            <Tag color={featDef.type === 'permission' ? 'blue' : 'orange'} style={{ fontSize: 11 }}>
                              {featDef.type === 'permission' ? '权限' : '配置'}
                            </Tag>
                            {featDef.required ? (
                              <Tag color="red" style={{ fontSize: 11 }}>必需</Tag>
                            ) : (
                              <Tag style={{ fontSize: 11 }}>可选</Tag>
                            )}
                            {featDef.description && (
                              <Tooltip title={featDef.description}>
                                <ExclamationCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                              </Tooltip>
                            )}
                          </Space>
                        </div>
                        {isEnabled && featDef.params && featDef.params.length > 0 && (
                          <div style={{ marginTop: 6, marginLeft: 40 }}>
                            {featDef.params.map((paramDef) => (
                              <div
                                key={paramDef.key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12, minWidth: 110 }}>
                                  {paramDef.label}:
                                </Text>
                                {renderParamInput(
                                  paramDef,
                                  params[paramDef.key] ?? paramDef.defaultValue,
                                  (val) =>
                                    setFeaturesState((prev) => ({
                                      ...prev,
                                      [product.code]: {
                                        ...prev[product.code],
                                        features: {
                                          ...prev[product.code].features,
                                          [featDef.code]: {
                                            ...prev[product.code].features[featDef.code],
                                            params: {
                                              ...prev[product.code].features[featDef.code].params,
                                              [paramDef.key]: val,
                                            },
                                          },
                                        },
                                      },
                                    })),
                                  false,
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </Card>
          );
        })}
      </Modal>
    </div>
  );
};

export default PackageManagement;
