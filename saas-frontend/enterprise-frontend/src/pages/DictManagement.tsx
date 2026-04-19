import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDictItems, createDictItem, updateDictItem, deleteDictItem, DictItem } from '@/api/dict';
import { useBranding } from '@/components/BrandingProvider';

const { Text } = Typography;

const typeOptions = [
  { label: '系统字典', value: 'system' },
  { label: '业务字典', value: 'business' },
  { label: '状态字典', value: 'status' },
];

const typeLabels: Record<string, string> = {
  system: '系统字典',
  business: '业务字典',
  status: '状态字典',
};

const typeColors: Record<string, { bg: string; color: string }> = {
  system: { bg: '#e3f2fd', color: '#1976d2' },
  business: { bg: '#e8f5e9', color: '#388e3c' },
  status: { bg: '#fff8e1', color: '#f57c00' },
};

type ModalMode = 'create' | 'edit';

const DictManagement: React.FC = () => {
  const { primaryColor } = useBranding();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);
  const [form] = Form.useForm();

  const colors = useMemo(() => ({
    primary: primaryColor,
    warmBorder: '#d4d0c8',
    bgSoft: '#fafaf7',
    textMuted: '#8a857f',
    textHeading: '#2c2825',
    sectionBg: '#f5f3f0',
  }), [primaryColor]);

  const { data, isLoading } = useQuery({
    queryKey: ['dict-items', page, keyword, typeFilter],
    queryFn: () => getDictItems({ page, size: 10, keyword, type: typeFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DictItem>) => createDictItem(data),
    onSuccess: (res: { code: number }) => {
      if (res.code === 200) {
        message.success('创建成功');
        closeModal();
        queryClient.invalidateQueries({ queryKey: ['dict-items'] });
      }
    },
    onError: () => message.error('创建失败，请重试'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: itemData }: { id: string; data: Partial<DictItem> }) =>
      updateDictItem(id, itemData),
    onSuccess: (res: { code: number }) => {
      if (res.code === 200) {
        message.success('更新成功');
        closeModal();
        queryClient.invalidateQueries({ queryKey: ['dict-items'] });
      }
    },
    onError: () => message.error('更新失败，请重试'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDictItem(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['dict-items'] });
    },
    onError: () => message.error('删除失败，请重试'),
  });

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setModalMode('create');
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback((record: DictItem) => {
    setEditingItem(record);
    setModalMode('edit');
    form.setFieldsValue(record);
    setModalOpen(true);
  }, [form]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback((values: Partial<DictItem>) => {
    if (modalMode === 'edit' && editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }, [modalMode, editingItem, createMutation, updateMutation]);

  const columns = useMemo(() => [
    {
      title: '字典名称',
      dataIndex: 'name',
      render: (name: string) => (
        <span style={{ fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)', fontWeight: 600, color: colors.textHeading }}>
          {name}
        </span>
      ),
    },
    {
      title: '字典编码',
      dataIndex: 'code',
      render: (code: string) => (
        <Text code style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {code}
        </Text>
      ),
    },
    {
      title: '字典类型',
      dataIndex: 'type',
      render: (type: string) => {
        const cfg = typeColors[type] || { bg: '#f5f5f5', color: '#666' };
        return (
          <Tag
            style={{
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              fontSize: 13,
              border: 'none',
              background: cfg.bg,
              color: cfg.color,
            }}
          >
            {typeLabels[type] || type}
          </Tag>
        );
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (desc: string) => (
        <span style={{ color: colors.textMuted, fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
          {desc || '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (enabled: boolean, record: DictItem) => (
        <Switch
          checked={enabled}
          onChange={(checked) =>
            updateMutation.mutate({
              id: record.id,
              data: { enabled: checked },
            })
          }
          style={{
            backgroundColor: enabled ? primaryColor : undefined,
          }}
        />
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: DictItem) => (
        <Space size={8}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            style={{
              borderRadius: 16,
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              border: '1px solid #d4d0c8',
              color: primaryColor,
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该字典项？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okButtonProps={{ style: { borderRadius: 20 } }}
            cancelButtonProps={{ style: { borderRadius: 20 } }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{
                borderRadius: 16,
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [colors.textHeading, colors.textMuted, primaryColor, updateMutation, deleteMutation, openEdit]);

  return (
    <div
      style={{
        padding: '0 0 24px',
        fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
        '--table-header-bg': colors.sectionBg,
        '--table-border': colors.warmBorder + '40',
        '--table-heading': colors.textHeading,
        '--table-row-hover': colors.bgSoft,
        '--pagination-active-bg': primaryColor + '15',
        '--pagination-active-border': primaryColor,
        '--pagination-active-color': primaryColor,
      } as React.CSSProperties}
    >
      <style>{`
        .dict-table .ant-table-thead > tr > th {
          background: var(--table-header-bg) !important;
          border-bottom: 1px solid var(--table-border) !important;
          font-family: 'Outfit', sans-serif !important;
          font-weight: 600 !important;
          color: var(--table-heading) !important;
          padding: 16px !important;
        }
        .dict-table .ant-table-tbody > tr > td {
          padding: 16px !important;
          border-bottom: 1px solid #f5f5f0 !important;
        }
        .dict-table .ant-table-tbody > tr:hover > td {
          background: var(--table-row-hover) !important;
        }
        .dict-table .ant-pagination-item {
          border-radius: 8px !important;
          border: 1px solid var(--table-border) !important;
        }
        .dict-table .ant-pagination-item-active {
          background: var(--pagination-active-bg) !important;
          border-color: var(--pagination-active-border) !important;
        }
        .dict-table .ant-pagination-item-active a {
          color: var(--pagination-active-color) !important;
        }
        .dict-table .ant-table-tbody > tr.dict-odd-row {
          background: var(--table-row-hover);
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 4,
            color: colors.textHeading,
          }}
        >
          字典管理
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
          管理系统中使用的字典项配置
        </p>
      </div>

      <div
        style={{
          background: colors.bgSoft,
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          border: `1px solid ${colors.warmBorder}`,
        }}
      >
        <Input.Search
          placeholder="搜索字典名称或编码"
          allowClear
          prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
          onSearch={(val) => { setKeyword(val || ''); setPage(1); }}
          style={{ width: 260 }}
          styles={{
            input: {
              borderRadius: 12,
              border: `1px solid ${colors.warmBorder}`,
            },
          }}
        />
        <Select
          placeholder="筛选类型"
          allowClear
          style={{ width: 140 }}
          onChange={(val) => { setTypeFilter(val || ''); setPage(1); }}
          options={typeOptions}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
            border: 'none',
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            fontWeight: 500,
            height: 36,
            paddingLeft: 20,
            paddingRight: 20,
            marginLeft: 'auto',
          }}
        >
          添加字典项
        </Button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: `1px solid ${colors.warmBorder}`,
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
                      border: `1px solid ${colors.warmBorder}`,
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
          className="dict-table"
          rowClassName={(_, index) => (index % 2 === 0 ? '' : 'dict-odd-row')}
        />
      </div>

      <Modal
        title={null}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={520}
        destroyOnClose
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
              color: colors.textHeading,
            }}
          >
            {modalMode === 'edit' ? '编辑字典项' : '添加字典项'}
          </h2>
        </div>
        <div style={{ padding: '28px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="字典名称"
              rules={[{ required: true, message: '请输入字典名称' }]}
            >
              <Input
                placeholder="请输入字典名称"
                style={{
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              />
            </Form.Item>
            <Form.Item
              name="code"
              label="字典编码"
              rules={[
                { required: true, message: '请输入字典编码' },
                { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '编码仅支持字母、数字和下划线' },
              ]}
            >
              <Input
                placeholder="请输入字典编码，如：gender_type"
                disabled={modalMode === 'edit'}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                  fontFamily: 'monospace',
                }}
              />
            </Form.Item>
            <Form.Item
              name="type"
              label="字典类型"
              rules={[{ required: true, message: '请选择字典类型' }]}
            >
              <Select
                style={{ width: '100%' }}
                options={typeOptions}
                placeholder="请选择字典类型"
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea
                rows={2}
                placeholder="请输入字典描述"
                style={{
                  borderRadius: 12,
                  border: `1px solid ${colors.warmBorder}`,
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              />
            </Form.Item>
            <Form.Item name="enabled" label="启用状态" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  onClick={closeModal}
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${colors.warmBorder}`,
                    color: colors.textMuted,
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
    </div>
  );
};

export default DictManagement;
