import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  message,
  Image,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  updateStock,
  Product,
  CreateProductParams,
} from '@/shared/api/products';

const typeOptions = [
  { label: '优惠券', value: 'coupon' },
  { label: '直充', value: 'recharge' },
  { label: '权益', value: 'privilege' },
];

const typeLabels: Record<string, string> = {
  coupon: '优惠券',
  recharge: '直充',
  privilege: '权益',
};

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState(0);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, keyword, typeFilter],
    queryFn: () => getProducts({ page, size: 10, keyword, type: typeFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductParams) => createProduct(data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductParams> }) => updateProduct(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => toggleProductStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => updateStock(id, stock),
    onSuccess: () => {
      message.success('库存更新成功');
      setStockModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const openEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openStockEdit = (record: Product) => {
    setStockProduct(record);
    setStockValue(record.stock);
    setStockModalOpen(true);
  };

  const handleSubmit = (values: CreateProductParams) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: '商品图片',
      dataIndex: 'imageUrl',
      render: (url?: string) =>
        url ? <Image src={url} width={48} height={48} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎁</div>,
    },
    { title: '商品名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => <Tag>{typeLabels[type] || type}</Tag>,
    },
    {
      title: '积分价格',
      dataIndex: 'pointsCost',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{v}</span>,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      render: (stock: number, record: Product) => (
        <Button type="link" size="small" onClick={() => openStockEdit(record)}>
          {stock === 0 ? <span style={{ color: '#ff4d4f' }}>售罄</span> : stock}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string, record: Product) => (
        <Switch
          checked={status === 'active'}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, status: checked ? 'active' : 'inactive' })}
        />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>商品管理</h2>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索商品名称"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 240 }}
        />
        <Select
          placeholder="筛选类型"
          allowClear
          style={{ width: 120 }}
          onChange={(val) => { setTypeFilter(val || ''); setPage(1); }}
          options={typeOptions}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProduct(null); form.resetFields(); setModalOpen(true); }}>
          创建商品
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data?.records || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.data?.total || 0,
          onChange: (p) => setPage(p),
        }}
      />

      <Modal
        title={editingProduct ? '编辑商品' : '创建商品'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="商品名称" rules={[{ required: true }]}>
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item name="description" label="商品描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>
          <Space>
            <Form.Item name="type" label="商品类型" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={typeOptions} />
            </Form.Item>
            <Form.Item name="pointsCost" label="积分价格" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Space>
            <Form.Item name="limitPerUser" label="每人限兑">
              <InputNumber min={0} placeholder="0表示不限" />
            </Form.Item>
            <Form.Item name="validityDays" label="有效期（天）" rules={[{ required: true }]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
          <Form.Item name="imageUrl" label="图片URL">
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              确定
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑库存"
        open={stockModalOpen}
        onCancel={() => setStockModalOpen(false)}
        onOk={() => stockProduct?.id && stockMutation.mutate({ id: stockProduct.id, stock: stockValue })}
        confirmLoading={stockMutation.isPending}
      >
        <p>商品：{stockProduct?.name}</p>
        <InputNumber
          value={stockValue}
          onChange={(v) => setStockValue(v ?? 0)}
          min={0}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
};

export default Products;
