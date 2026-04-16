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
  Card,
  Checkbox,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
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
  Product,
  Feature,
} from '@/api/platform';

const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<{ [key: string]: { enabled: boolean; required: boolean; configValue?: string } }>({});
  const [form] = Form.useForm();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', page, pageSize, categoryFilter],
    queryFn: () => getProducts({ page, size: pageSize, category: categoryFilter }),
  });

  const { data: featuresData } = useQuery({
    queryKey: ['all-features'],
    queryFn: () => getFeatures({ size: 100 }),
    enabled: featureModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateProduct(id, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('更新成功');
        setModalOpen(false);
        setEditingProduct(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: ({ productId, features }: { productId: string; features: any[] }) =>
      updateProductFeatures(productId, features),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('功能点更新成功');
        setFeatureModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        message.error(res.message || '更新失败');
      }
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
      const featureMap: { [key: string]: { enabled: boolean; required: boolean; configValue?: string } } = {};
      (productFeatures.data || []).forEach((pf: any) => {
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

  const handleFormFinish = (values: any) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleFeatureSave = () => {
    if (!selectedProduct) return;
    const allFeatures = featuresData?.data || featuresData?.data?.records || [];
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

  const columns = [
    { title: '产品编码', dataIndex: 'code' },
    { title: '产品名称', dataIndex: 'name' },
    {
      title: '分类',
      dataIndex: 'category',
      render: (category: string) => (
        <Tag color={category === 'stairs_climbing' ? 'blue' : 'green'}>
          {category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
        </Tag>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '功能点数', dataIndex: 'featureCount' },
    { title: '排序', dataIndex: 'sortOrder' },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => openFeatureModal(record)}>
            配置功能
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const products = productsData?.data?.records || productsData?.data || [];
  const total = productsData?.data?.total || products.length;
  const allFeatures = featuresData?.data || featuresData?.data?.records || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>产品管理</h2>
        <Space>
          <Select
            placeholder="筛选分类"
            allowClear
            style={{ width: 150 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
          >
            <Select.Option value="stairs_climbing">爬楼积分</Select.Option>
            <Select.Option value="walking">走路积分</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增产品
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={products}
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
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormFinish}
        >
          {!editingProduct && (
            <>
              <Form.Item
                name="code"
                label="产品编码"
                rules={[{ required: true, message: '请输入产品编码' }]}
              >
                <Input placeholder="请输入产品编码，如: stairs_basic" />
              </Form.Item>
              <Form.Item
                name="category"
                label="产品分类"
                rules={[{ required: true, message: '请选择产品分类' }]}
              >
                <Select placeholder="请选择产品分类">
                  <Select.Option value="stairs_climbing">爬楼积分</Select.Option>
                  <Select.Option value="walking">走路积分</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
          {editingProduct && (
            <>
              <Form.Item label="产品编码">
                <Input value={editingProduct.code} disabled />
              </Form.Item>
              <Form.Item label="产品分类">
                <Tag color={editingProduct.category === 'stairs_climbing' ? 'blue' : 'green'}>
                  {editingProduct.category === 'stairs_climbing' ? '爬楼积分' : '走路积分'}
                </Tag>
              </Form.Item>
            </>
          )}
          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
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
          <Form.Item
            name="sortOrder"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProduct ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`配置功能点 - ${selectedProduct?.name}`}
        open={featureModalOpen}
        onCancel={() => { setFeatureModalOpen(false); setSelectedProduct(null); }}
        onOk={handleFeatureSave}
        confirmLoading={updateFeaturesMutation.isPending}
        width={800}
      >
        <Card size="small" style={{ marginBottom: 16 }} type="inner" title="功能点列表">
          {allFeatures.map((feature: Feature) => (
            <div key={feature.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Checkbox
                    checked={selectedFeatures[feature.id]?.enabled}
                    onChange={(e) => setSelectedFeatures(prev => ({
                      ...prev,
                      [feature.id]: { ...prev[feature.id], enabled: e.target.checked },
                    }))}
                  >
                    <strong>{feature.name}</strong>
                    <Tag color={feature.type === 'permission' ? 'blue' : 'orange'}>
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
                        onChange={(e) => setSelectedFeatures(prev => ({
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
                        onChange={(e) => setSelectedFeatures(prev => ({
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
                <div style={{ marginLeft: 24, marginTop: 4, color: '#666', fontSize: 13 }}>
                  {feature.description}
                </div>
              )}
            </div>
          ))}
        </Card>
      </Modal>
    </div>
  );
};

export default ProductManagement;
