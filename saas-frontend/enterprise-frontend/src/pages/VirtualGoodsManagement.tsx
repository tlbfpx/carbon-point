import React, { useState, useMemo } from 'react';
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
import { PlusOutlined, EditOutlined, GiftOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts as getVirtualGoods,
  createProduct as createVirtualGoods,
  updateProduct as updateVirtualGoods,
  toggleProductStatus as toggleVirtualGoodsStatus,
  updateStock as updateVirtualGoodsStock,
  Product as VirtualGoods,
  CreateProductParams as CreateVirtualGoodsParams,
} from '@/api/products';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

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

const typeTagColors: Record<string, { bg: string; color: string }> = {
  coupon: { bg: '#e3f2fd', color: '#1976d2' },
  recharge: { bg: '#e8f5e9', color: '#388e3c' },
  privilege: { bg: '#fff8e1', color: '#f57c00' },
};

const VirtualGoodsManagement: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VirtualGoods | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<VirtualGoods | null>(null);
  const [stockValue, setStockValue] = useState(0);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['virtual-goods', page, keyword, typeFilter],
    queryFn: () => getVirtualGoods({ page, size: 10, keyword, type: typeFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (params: CreateVirtualGoodsParams) => createVirtualGoods(params),
    onSuccess: () => {
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['virtual-goods'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVirtualGoodsParams> }) => updateVirtualGoods(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['virtual-goods'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => toggleVirtualGoodsStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['virtual-goods'] }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => updateVirtualGoodsStock(id, stock),
    onSuccess: () => {
      message.success('库存更新成功');
      setStockModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['virtual-goods'] });
    },
  });

  const openEdit = (record: VirtualGoods) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openStockEdit = (record: VirtualGoods) => {
    setStockItem(record);
    setStockValue(record.stock);
    setStockModalOpen(true);
  };

  const handleSubmit = (values: CreateVirtualGoodsParams) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = useMemo(() => [
    {
      title: '商品图片',
      dataIndex: 'image',
      render: (url?: string) =>
        url ? (
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden' }}>
            <Image src={url} width={56} height={56} preview={false} style={{ objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            <GiftOutlined style={{ color: '#bbb' }} />
          </div>
        ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      render: (name: string) => <span style={{ fontFamily: 'var(--font-body)' }}>{name}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => {
        const colors = typeTagColors[type] || { bg: '#f5f5f5', color: '#666' };
        return <Tag style={{ borderRadius: 20, padding: '4px 12px', background: colors.bg, color: colors.color }}>{typeLabels[type] || type}</Tag>;
      },
    },
    {
      title: '积分价格',
      dataIndex: 'pointsPrice',
      render: (v: number) => <span style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 600, color: primaryColor }}>{v}</span>,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      render: (stock: number, record: VirtualGoods) => (
        <Button size="small" onClick={() => openStockEdit(record)} style={{ borderRadius: 16, border: '1px solid #d4d0c8', background: stock === 0 ? 'rgba(239,68,68,0.1)' : 'transparent', color: stock === 0 ? '#ff4d4f' : primaryColor }}>
          {stock === 0 ? '售罄' : stock}
        </Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string, record: VirtualGoods) => (
        <Switch checked={status === 'active'} onChange={(checked) => toggleMutation.mutate({ id: record.id, status: checked ? 'active' : 'inactive' })} />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: VirtualGoods) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ borderRadius: 20, border: '1px solid #d4d0c8', color: primaryColor }}>
            编辑
          </Button>
        </Space>
      ),
    },
  ], [primaryColor, toggleMutation, openStockEdit, openEdit]);

  return (
    <div style={{ padding: '0 0 24px' }}>
      {!hideHeader && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 600, marginBottom: 4, color: '#2c2825' }}>虚拟商品管理</h2>
          <p style={{ color: '#8a857f', fontSize: 14, margin: 0 }}>管理企业可兑换的虚拟商品</p>
        </div>
      )}

      <GlassCard hoverable style={{ marginBottom: 20, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search placeholder="搜索商品名称" allowClear onSearch={(val) => { setKeyword(val); setPage(1); }} style={{ width: 240 }} />
        <Select placeholder="筛选类型" allowClear style={{ width: 140 }} onChange={(val) => { setTypeFilter(val || ''); setPage(1); }} options={typeOptions} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setModalOpen(true); }} style={{ borderRadius: 20, background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`, marginLeft: 'auto' }}>
          添加商品
        </Button>
      </GlassCard>

      <GlassCard hoverable style={{ overflow: 'hidden' }}>
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
            showSizeChanger: false,
          }}
          className="digital-garden-table"
        />
      </GlassCard>

      <Modal title={null} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={520} closeIcon={null} styles={{ content: { borderRadius: 24, padding: 0 } }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #d4d0c8' }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 600, margin: 0 }}>{editingItem ? '编辑商品' : '添加商品'}</h2>
        </div>
        <div style={{ padding: '28px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="商品名称" rules={[{ required: true }]}><Input placeholder="请输入商品名称" /></Form.Item>
            <Form.Item name="description" label="商品描述" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="请输入商品描述" /></Form.Item>
            <Space size={12}>
              <Form.Item name="type" label="商品类型" rules={[{ required: true }]}><Select style={{ width: 140 }} options={typeOptions} /></Form.Item>
              <Form.Item name="pointsPrice" label="积分价格" rules={[{ required: true }]}><InputNumber min={1} style={{ width: 120 }} /></Form.Item>
              <Form.Item name="stock" label="库存" rules={[{ required: true }]}><InputNumber min={0} style={{ width: 120 }} /></Form.Item>
            </Space>
            <Space size={12}>
              <Form.Item name="maxPerUser" label="每人限兑"><InputNumber min={0} placeholder="0表示不限" style={{ width: 140 }} /></Form.Item>
              <Form.Item name="validityDays" label="有效期" rules={[{ required: true }]}><InputNumber min={1} placeholder="天" style={{ width: 140 }} /></Form.Item>
            </Space>
            <Form.Item name="image" label="图片URL"><Input placeholder="请输入图片URL" /></Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 20, border: '1px solid #d4d0c8' }}>取消</Button>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} style={{ borderRadius: 20, background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}>确定</Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <Modal title={null} open={stockModalOpen} onCancel={() => setStockModalOpen(false)} footer={null} width={420} closeIcon={null}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #d4d0c8' }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 600, margin: 0 }}>编辑库存</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#8a857f', marginBottom: 16 }}>商品：{stockItem?.name}</p>
          <InputNumber value={stockValue} onChange={(v) => setStockValue(v ?? 0)} min={0} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <Button onClick={() => setStockModalOpen(false)} style={{ borderRadius: 20, border: '1px solid #d4d0c8' }}>取消</Button>
            <Button type="primary" onClick={() => stockItem?.id && stockMutation.mutate({ id: stockItem.id, stock: stockValue })} loading={stockMutation.isPending} style={{ borderRadius: 20, background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VirtualGoodsManagement;
