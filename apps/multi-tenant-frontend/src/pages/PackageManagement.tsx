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
  Collapse,
  Checkbox,
  Card,
  Switch,
  Typography,
  InputNumber,
  Tooltip,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { Text } = Typography;
import type { PermissionPackage, Product, Feature, ProductFeature } from '@/api/platform';
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
} from '@/api/platform';

const { Panel } = Collapse;

const PackageManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState<'create' | 'edit'>('create');
  const [editingPackage, setEditingPackage] = useState<PermissionPackage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [packageProductFeatures, setPackageProductFeatures] = useState<{
    [productId: string]: { [featureId: string]: ProductFeature };
  }>({});
  const [productFeaturesLoading, setProductFeaturesLoading] = useState(false);

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['packages', page, pageSize],
    queryFn: () => getPackages({ page, size: pageSize }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['all-products-for-package'],
    queryFn: () => getProducts({ size: 100, status: 1 }),
    enabled: productModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createPackage,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐创建成功');
        setPackageModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      updatePackage(id, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐更新成功');
        setPackageModalOpen(false);
        setEditingPackage(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePackage,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐已删除');
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  const updateProductsMutation = useMutation({
    mutationFn: ({ packageId, products }: { packageId: string; products: { productId: string; sortOrder?: number }[] }) =>
      updatePackageProducts(packageId, products),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐产品更新成功');
        setProductModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const updateProductFeaturesMutation = useMutation({
    mutationFn: ({ packageId, productId, features }: { packageId: string; productId: string; features: { featureId: string; configValue?: string; isEnabled: boolean }[] }) =>
      updatePackageProductFeatures(packageId, productId, features),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('功能点配置保存成功');
        queryClient.invalidateQueries({ queryKey: ['packages'] });
      } else {
        message.error(res.message || '保存失败');
      }
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

  const openProductModal = async (record: any) => {
    setSelectedPackage(record);
    setProductFeaturesLoading(true);
    try {
      const detail = await getPackageDetail(record.id);
      const packageProducts = detail.data?.products || [];
      setSelectedProducts(packageProducts.map((p: any) => p.productId));

      // Load features for each product
      const featureMap: { [productId: string]: { [featureId: string]: ProductFeature } } = {};
      for (const pkgProduct of packageProducts) {
        if (pkgProduct.productId) {
          try {
            const featuresData = await getProductFeatures(pkgProduct.productId);
            const productFeatures: ProductFeature[] = featuresData.data || [];
            featureMap[pkgProduct.productId] = {};
            productFeatures.forEach((pf: ProductFeature) => {
              featureMap[pkgProduct.productId][pf.featureId] = pf;
            });
          } catch {
            // Ignore if features can't be loaded
          }
        }
      }
      setPackageProductFeatures(featureMap);
    } catch {
      setSelectedProducts([]);
      setPackageProductFeatures({});
    } finally {
      setProductFeaturesLoading(false);
    }
    setProductModalOpen(true);
  };

  const handleFormFinish = (values: { code?: string; name: string; description?: string }) => {
    if (packageModalMode === 'create') {
      createMutation.mutate({ code: `PKG_${Date.now()}`, name: values.name, description: values.description, permissionCodes: [] });
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

  const columns = [
    { title: '套餐编码', dataIndex: 'code', render: (v: string) => <Text code>{v}</Text> },
    { title: '套餐名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '启用' : '禁用'}</Tag> },
    { title: '权限数', dataIndex: 'permissionCount' },
    { title: '使用企业', dataIndex: 'tenantCount' },
    { title: '操作', width: 200, render: (_: unknown, record: PermissionPackage) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
        <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openProductModal(record)}>
          配置产品
        </Button>
        {record.code !== 'free' && (
          <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  const records = packagesData?.data?.records || packagesData?.data || [];
  const total = packagesData?.data?.total || records.length;
  const allProducts = productsData?.data?.records || productsData?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>套餐管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          创建套餐
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
        }}
      />

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
              <Button onClick={() => { setPackageModalOpen(false); setEditingPackage(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`配置产品 - ${selectedPackage?.name}`}
        open={productModalOpen}
        onCancel={() => { setProductModalOpen(false); setSelectedPackage(null); }}
        onOk={handleProductSave}
        confirmLoading={updateProductsMutation.isPending || productFeaturesLoading}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Card size="small" type="inner" title="选择产品">
            {allProducts.map((product: Product) => (
              <div key={product.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts([...selectedProducts, product.id]);
                      } else {
                        setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        const newFeatures = { ...packageProductFeatures };
                        delete newFeatures[product.id];
                        setPackageProductFeatures(newFeatures);
                      }
                    }}
                  >
                    <strong>{product.name}</strong>
                    <Tag color={product.category === 'stairs_climbing' ? 'blue' : 'green'}>
                      {product.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
                    </Tag>
                  </Checkbox>
                </Space>
                {product.description && (
                  <div style={{ marginLeft: 24, marginTop: 4, color: '#666', fontSize: 13 }}>
                    {product.description}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>

        {selectedProducts.length > 0 && (
          <Card size="small" type="inner" title="产品功能点配置（可选）">
            <Collapse defaultActiveKey={selectedProducts}>
              {allProducts
                .filter((p: Product) => selectedProducts.includes(p.id))
                .map((product: Product) => (
                  <Panel header={`${product.name} - 功能点配置`} key={product.id}>
                    <div style={{ padding: '8px 0' }}>
                      <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                        提示：不修改则使用产品默认配置，修改后标记为"自定义"
                      </p>
                      {(() => {
                        const features = packageProductFeatures[product.id] || {};
                        const featureList = Object.values(features) as ProductFeature[];
                        if (featureList.length === 0) {
                          return <Text type="secondary">暂无可用功能点</Text>;
                        }
                        return (
                          <div>
                            {featureList.map((pf) => (
                              <div
                                key={pf.featureId}
                                style={{
                                  padding: '8px 12px',
                                  marginBottom: 8,
                                  background: '#fafafa',
                                  borderRadius: 6,
                                  border: '1px solid #f0f0f0',
                                }}
                              >
                                <Space align="start" style={{ width: '100%' }}>
                                  <Checkbox
                                    checked={pf.isEnabled}
                                    onChange={(e) => {
                                      setPackageProductFeatures((prev) => ({
                                        ...prev,
                                        [product.id]: {
                                          ...prev[product.id],
                                          [pf.featureId]: {
                                            ...pf,
                                            isEnabled: e.target.checked,
                                          },
                                        },
                                      }));
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <Space>
                                      <Text strong>{pf.feature?.name || pf.featureId}</Text>
                                      <Tag color={pf.feature?.type === 'permission' ? 'blue' : 'green'}>
                                        {pf.feature?.type === 'permission' ? '权限' : '配置'}
                                      </Tag>
                                      {pf.isRequired && <Tag color="orange">必需</Tag>}
                                      {pf.configValue !== undefined && pf.configValue !== pf.feature?.defaultValue && (
                                        <Tag color="purple">自定义</Tag>
                                      )}
                                    </Space>
                                    {pf.feature?.description && (
                                      <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                                        {pf.feature.description}
                                      </div>
                                    )}
                                  </div>
                                  {pf.feature?.type === 'config' && pf.isEnabled && (
                                    <div style={{ minWidth: 200 }}>
                                      {pf.feature.valueType === 'boolean' ? (
                                        <Switch
                                          checked={pf.configValue === 'true' || pf.configValue === '1'}
                                          onChange={(checked) => {
                                            setPackageProductFeatures((prev) => ({
                                              ...prev,
                                              [product.id]: {
                                                ...prev[product.id],
                                                [pf.featureId]: {
                                                  ...pf,
                                                  configValue: String(checked),
                                                },
                                              },
                                            }));
                                          }}
                                          checkedChildren="开"
                                          unCheckedChildren="关"
                                        />
                                      ) : pf.feature.valueType === 'number' ? (
                                        <InputNumber
                                          style={{ width: '100%' }}
                                          value={pf.configValue ? Number(pf.configValue) : undefined}
                                          placeholder={pf.feature.defaultValue || '请输入数值'}
                                          onChange={(val) => {
                                            setPackageProductFeatures((prev) => ({
                                              ...prev,
                                              [product.id]: {
                                                ...prev[product.id],
                                                [pf.featureId]: {
                                                  ...pf,
                                                  configValue: val !== null ? String(val) : undefined,
                                                },
                                              },
                                            }));
                                          }}
                                        />
                                      ) : pf.feature.valueType === 'json' ? (
                                        <Input.TextArea
                                          rows={2}
                                          value={pf.configValue || ''}
                                          placeholder={pf.feature.defaultValue || '{"key": "value"}'}
                                          onChange={(e) => {
                                            setPackageProductFeatures((prev) => ({
                                              ...prev,
                                              [product.id]: {
                                                ...prev[product.id],
                                                [pf.featureId]: {
                                                  ...pf,
                                                  configValue: e.target.value,
                                                },
                                              },
                                            }));
                                          }}
                                        />
                                      ) : (
                                        <Input
                                          value={pf.configValue || ''}
                                          placeholder={pf.feature.defaultValue || '请输入配置值'}
                                          onChange={(e) => {
                                            setPackageProductFeatures((prev) => ({
                                              ...prev,
                                              [product.id]: {
                                                ...prev[product.id],
                                                [pf.featureId]: {
                                                  ...pf,
                                                  configValue: e.target.value,
                                                },
                                              },
                                            }));
                                          }}
                                        />
                                      )}
                                    </div>
                                  )}
                                </Space>
                              </div>
                            ))}
                            <Button
                              type="primary"
                              size="small"
                              style={{ marginTop: 8 }}
                              onClick={() => {
                                const features = Object.values(packageProductFeatures[product.id] || {}).map((pf: ProductFeature) => ({
                                  featureId: pf.featureId,
                                  configValue: pf.configValue,
                                  isEnabled: pf.isEnabled,
                                }));
                                updateProductFeaturesMutation.mutate({
                                  packageId: selectedPackage?.id,
                                  productId: product.id,
                                  features,
                                });
                              }}
                              loading={updateProductFeaturesMutation.isPending}
                            >
                              保存该产品功能点
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  </Panel>
                ))}
            </Collapse>
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default PackageManagement;
