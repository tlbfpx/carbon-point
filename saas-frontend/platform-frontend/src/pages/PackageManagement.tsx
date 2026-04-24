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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { PermissionPackage, Product, Feature, ProductFeature, PackageProduct } from '@/api/platform';
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
        if (pkgProduct.productId) {
          try {
            const featuresData = await getProductFeatures(pkgProduct.productId);
            const productFeatures: ProductFeature[] = featuresData || [];
            featureMap[pkgProduct.productId] = {};
            productFeatures.forEach((pf: ProductFeature) => {
              featureMap[pkgProduct.productId][pf.featureId] = pf;
            });
          } catch {
            // ignore
          }
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
      width: 260,
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

      {/* Product Configuration Modal */}
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
                          <Text strong>{pf.feature?.name || pf.featureId}</Text>
                          <Tag color={pf.feature?.type === 'permission' ? 'blue' : 'orange'}>
                            {pf.feature?.type === 'permission' ? '权限' : '配置'}
                          </Tag>
                          {pf.isRequired ? (
                            <Tag color="red" icon={<LockOutlined />}>必需</Tag>
                          ) : (
                            <Tag color="default">可选</Tag>
                          )}
                        </Space>
                        {pf.feature?.type === 'config' && pf.isEnabled && !pf.isRequired && (
                          <div style={{ minWidth: 160 }}>
                            {pf.feature.valueType === 'boolean' ? (
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
                                placeholder={pf.feature?.defaultValue || '配置值'}
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
    </div>
  );
};

export default PackageManagement;
