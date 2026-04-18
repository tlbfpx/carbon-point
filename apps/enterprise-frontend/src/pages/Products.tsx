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
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  updateStock,
  Product,
  CreateProductParams,
} from '@/api/products';
import { useBranding } from '@/components/BrandingProvider';

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

// Pastel colors for type tags
const typeTagColors: Record<string, { bg: string; color: string }> = {
  coupon: { bg: '#e3f2fd', color: '#1976d2' },
  recharge: { bg: '#e8f5e9', color: '#388e3c' },
  privilege: { bg: '#fff8e1', color: '#f57c00' },
};

const Products: React.FC = () => {
  const { primaryColor } = useBranding();
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

  const columns = useMemo(() => [
    {
      title: '商品图片',
      dataIndex: 'image',
      render: (url?: string) =>
        url ? (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Image
              src={url}
              width={56}
              height={56}
              preview={false}
              style={{ objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <GiftOutlined style={{ color: '#bbb' }} />
          </div>
        ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      render: (name: string) => (
        <span style={{ fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)', fontWeight: 500 }}>
          {name}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => {
        const colors = typeTagColors[type] || { bg: '#f5f5f5', color: '#666' };
        return (
          <Tag
            style={{
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              fontSize: 13,
              border: 'none',
              background: colors.bg,
              color: colors.color,
            }}
          >
            {typeLabels[type] || type}
          </Tag>
        );
      },
    },
    {
      title: '积分价格',
      dataIndex: 'pointsPrice',
      render: (v: number) => (
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: primaryColor,
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      render: (stock: number, record: Product) => (
        <Button
          size="small"
          onClick={() => openStockEdit(record)}
          style={{
            borderRadius: 16,
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            border: '1px solid #d4d0c8',
            background: stock === 0 ? '#fff5f5' : 'transparent',
            color: stock === 0 ? '#ff4d4f' : primaryColor,
          }}
        >
          {stock === 0 ? '售罄' : stock}
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
          style={{
            backgroundColor: status === 'active' ? primaryColor : undefined,
          }}
        />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            style={{
              borderRadius: 20,
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              border: '1px solid #d4d0c8',
              color: primaryColor,
            }}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ], [primaryColor, toggleMutation, openStockEdit, openEdit]);

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: '#1a1a1a',
          }}
        >
          商品管理
        </h1>
        <p style={{ color: '#888', fontSize: 14, margin: 0 }}>管理您的虚拟商品库存和设置</p>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: '#fafaf7',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Input.Search
          placeholder="搜索商品名称"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 240 }}
          styles={{
            input: {
              borderRadius: 12,
              border: '1px solid #d4d0c8',
            },
          }}
        />
        <Select
          placeholder="筛选类型"
          allowClear
          style={{ width: 140, borderRadius: 12 }}
          onChange={(val) => { setTypeFilter(val || ''); setPage(1); }}
          options={typeOptions}
          variant="outlined"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingProduct(null); form.resetFields(); setModalOpen(true); }}
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
            border: 'none',
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            fontWeight: 500,
            padding: '4px 20px',
            height: 36,
            marginLeft: 'auto',
          }}
        >
          添加商品
        </Button>
      </div>

      {/* Table Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
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
            itemRender: (current, type, originalElement) => {
              if (type === 'page') {
                return (
                  <Button
                    style={{
                      borderRadius: 8,
                      border: '1px solid #d4d0c8',
                      color: current === page ? primaryColor : '#666',
                      background: current === page ? `${primaryColor}15` : '#fff',
                      fontWeight: current === page ? 600 : 400,
                    }}
                  >
                    {current}
                  </Button>
                );
              }
              return originalElement;
            },
          }}
          style={{
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
          }}
          className="digital-garden-table"
          rowClassName={(record, index) => (index % 2 === 0 ? '' : 'odd-row')}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        closeIcon={null}
        styles={{
          content: {
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: '#1a1a1a',
            }}
          >
            {editingProduct ? '编辑商品' : '添加商品'}
          </h2>
        </div>
        <div style={{ padding: '28px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="商品名称" rules={[{ required: true }]}>
              <Input
                placeholder="请输入商品名称"
                style={{
                  borderRadius: 12,
                  border: '1px solid #d4d0c8',
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              />
            </Form.Item>
            <Form.Item name="description" label="商品描述" rules={[{ required: true }]}>
              <Input.TextArea
                rows={3}
                placeholder="请输入商品描述"
                style={{
                  borderRadius: 12,
                  border: '1px solid #d4d0c8',
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              />
            </Form.Item>
            <Space size={12}>
              <Form.Item name="type" label="商品类型" rules={[{ required: true }]}>
                <Select
                  style={{ width: 140, borderRadius: 12 }}
                  options={typeOptions}
                  variant="outlined"
                />
              </Form.Item>
              <Form.Item name="pointsPrice" label="积分价格" rules={[{ required: true }]}>
                <InputNumber
                  min={1}
                  style={{
                    width: 120,
                    borderRadius: 12,
                    border: '1px solid #d4d0c8',
                  }}
                />
              </Form.Item>
              <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{
                    width: 120,
                    borderRadius: 12,
                    border: '1px solid #d4d0c8',
                  }}
                />
              </Form.Item>
            </Space>
            <Space size={12}>
              <Form.Item name="maxPerUser" label="每人限兑">
                <InputNumber
                  min={0}
                  placeholder="0表示不限"
                  style={{
                    width: 140,
                    borderRadius: 12,
                    border: '1px solid #d4d0c8',
                  }}
                />
              </Form.Item>
              <Form.Item name="validityDays" label="有效期（天）" rules={[{ required: true }]}>
                <InputNumber
                  min={1}
                  style={{
                    width: 140,
                    borderRadius: 12,
                    border: '1px solid #d4d0c8',
                  }}
                />
              </Form.Item>
            </Space>
            <Form.Item name="image" label="图片URL">
              <Input
                placeholder="请输入图片URL"
                style={{
                  borderRadius: 12,
                  border: '1px solid #d4d0c8',
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  onClick={() => setModalOpen(false)}
                  style={{
                    borderRadius: 20,
                    border: '1px solid #d4d0c8',
                    color: '#666',
                    fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                  }}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  style={{
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                    border: 'none',
                    fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                  }}
                >
                  确定
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Stock Edit Modal */}
      <Modal
        title={null}
        open={stockModalOpen}
        onCancel={() => setStockModalOpen(false)}
        footer={null}
        width={420}
        closeIcon={null}
        styles={{
          content: {
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              color: '#1a1a1a',
            }}
          >
            编辑库存
          </h2>
        </div>
        <div style={{ padding: '24px' }}>
          <p
            style={{
              color: '#666',
              marginBottom: 16,
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            }}
          >
            商品：{stockProduct?.name}
          </p>
          <InputNumber
            value={stockValue}
            onChange={(v) => setStockValue(v ?? 0)}
            min={0}
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid #d4d0c8',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 20,
            }}
          >
            <Button
              onClick={() => setStockModalOpen(false)}
              style={{
                borderRadius: 20,
                border: '1px solid #d4d0c8',
                color: '#666',
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={() => stockProduct?.id && stockMutation.mutate({ id: stockProduct.id, stock: stockValue })}
              loading={stockMutation.isPending}
              style={{
                borderRadius: 20,
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                border: 'none',
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .digital-garden-table .ant-table-thead > tr > th {
          background: #f8f7f4 !important;
          border-bottom: 1px solid #ebe9e4 !important;
          font-family: 'Outfit', sans-serif !important;
          font-weight: 600 !important;
          color: #333 !important;
          padding: 16px !important;
        }
        .digital-garden-table .ant-table-tbody > tr > td {
          padding: 16px !important;
          border-bottom: 1px solid #f5f5f0 !important;
        }
        .digital-garden-table .ant-table-tbody > tr:hover > td {
          background: #fafaf7 !important;
        }
        .digital-garden-table .ant-table-tbody > tr > td:first-child {
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }
        .digital-garden-table .ant-table-tbody > tr > td:last-child {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .digital-garden-table .ant-table-tbody > tr.odd-row {
          background: #fbfbf9;
        }
        .digital-garden-table .ant-pagination-item {
          border-radius: 8px !important;
          border: 1px solid #d4d0c8 !important;
        }
        .digital-garden-table .ant-pagination-item-active {
          background: ${primaryColor}15 !important;
          border-color: ${primaryColor} !important;
        }
        .digital-garden-table .ant-pagination-item-active a {
          color: ${primaryColor} !important;
        }
      `}</style>
    </div>
  );
};

export default Products;
