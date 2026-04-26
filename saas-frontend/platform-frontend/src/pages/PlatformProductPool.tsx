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
  Empty,
  Tooltip,
  Image,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, GiftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPlatformMallProducts,
  createPlatformMallProduct,
  updatePlatformMallProduct,
  togglePlatformMallProductStatus,
  deletePlatformMallProduct,
  PlatformMallProduct,
  CreatePlatformMallProductParams,
} from '@/api/mall';

const TYPE_OPTIONS = [
  { value: 'coupon', label: '优惠券', color: 'blue' },
  { value: 'recharge', label: '直充', color: 'green' },
  { value: 'privilege', label: '权益', color: 'orange' },
] as const;

const TYPE_LABELS: Record<string, string> = {
  coupon: '优惠券',
  recharge: '直充',
  privilege: '权益',
};

const PlatformProductPool: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformMallProduct | null>(null);
  const [form] = Form.useForm();

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['platform-mall-products', page, pageSize, typeFilter, keyword],
    queryFn: () => getPlatformMallProducts({ page, size: pageSize, type: typeFilter, keyword }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: createPlatformMallProduct,
    onSuccess: () => {
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['platform-mall-products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlatformMallProductParams> }) =>
      updatePlatformMallProduct(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['platform-mall-products'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: togglePlatformMallProductStatus,
    onSuccess: () => {
      message.success('状态切换成功');
      queryClient.invalidateQueries({ queryKey: ['platform-mall-products'] });
    },
    onError: () => {
      message.error('状态切换失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlatformMallProduct,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['platform-mall-products'] });
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

  const openEditModal = (record: PlatformMallProduct) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      price: record.price,
      image: record.image,
      stock: record.stock,
      sortOrder: record.sortOrder,
    });
    setModalOpen(true);
  };

  const handleFormFinish = (values: CreatePlatformMallProductParams) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const formatPrice = (cents: number) => {
    const yuan = cents / 100;
    return `¥${yuan.toFixed(2)}`;
  };

  const products = productsData?.records || (Array.isArray(productsData) ? productsData : []);
  const total = productsData?.total || products.length;

  const columns = [
    {
      title: '商品图片',
      dataIndex: 'image',
      width: 80,
      render: (url?: string) =>
        url ? (
          <Image src={url} width={48} height={48} preview={false} style={{ borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GiftOutlined style={{ color: '#bbb', fontSize: 20 }} />
          </div>
        ),
    },
    { title: '商品名称', dataIndex: 'name', width: 180 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => {
        const opt = TYPE_OPTIONS.find((o) => o.value === type);
        return <Tag color={opt?.color || 'default'}>{TYPE_LABELS[type] || type}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      render: (price: number) => (
        <span style={{ fontWeight: 600, color: '#1E293B' }}>{formatPrice(price)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string, record: PlatformMallProduct) => (
        <Switch
          checked={status === 'active'}
          onChange={() => toggleMutation.mutate(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 70,
      render: (v: number) => v ?? 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 110,
      render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, record: PlatformMallProduct) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该商品？"
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>商品池管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            添加商品
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 12 }}>
        <Select
          placeholder="筛选类型"
          allowClear
          style={{ width: 150 }}
          value={typeFilter}
          onChange={(val) => {
            setTypeFilter(val);
            setPage(1);
          }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
        <Input.Search
          placeholder="搜索商品名称"
          allowClear
          style={{ width: 200 }}
          onSearch={(val) => {
            setKeyword(val);
            setPage(1);
          }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={isLoading}
        locale={{ emptyText: <Empty description="暂无商品数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps || 10);
          },
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item name="type" label="商品类型" rules={[{ required: true, message: '请选择商品类型' }]}>
            <Select placeholder="请选择商品类型">
              {TYPE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述（选填）" />
          </Form.Item>
          <Form.Item
            name="price"
            label="价格（分）"
            rules={[{ required: true, message: '请输入价格' }]}
            extra="单位为分，例如 100 = 1.00元"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="如: 100 表示 1.00元" />
          </Form.Item>
          <Form.Item name="image" label="图片URL">
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="stock" label="库存" initialValue={0}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序" initialValue={0}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingProduct ? '保存修改' : '确认创建'}
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  setEditingProduct(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformProductPool;
