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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getDictItems,
  createDictItem,
  updateDictItem,
  deleteDictItem,
  DictItem,
} from '@/api/platform';
import { extractArray } from '@/utils';

const DictManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);
  const [dictTypeFilter, setDictTypeFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  const { data: dictData, isLoading } = useQuery({
    queryKey: ['dict-items', dictTypeFilter],
    queryFn: () => getDictItems({ dictType: dictTypeFilter, size: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: createDictItem,
    onSuccess: () => {
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['dict-items'] });
    },
    onError: (err: any) => {
      message.error(err?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateDictItem(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      setEditingItem(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['dict-items'] });
    },
    onError: (err: any) => {
      message.error(err?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDictItem,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['dict-items'] });
    },
    onError: (err: any) => {
      message.error(err?.message || '删除失败');
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: DictItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      dictName: record.dictName,
      status: record.status,
      sortOrder: record.sortOrder,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const handleFormFinish = (values: any) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: '字典类型', dataIndex: 'dictType' },
    { title: '字典编码', dataIndex: 'dictCode' },
    { title: '字典名称', dataIndex: 'dictName' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: DictItem) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
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

  const items = extractArray<DictItem>(dictData);

  // Extract unique dict types for filter
  const dictTypes = Array.from(new Set(items.map((item: DictItem) => item.dictType))) as string[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>字典管理</h2>
        <Space>
          <Select
            placeholder="筛选字典类型"
            allowClear
            style={{ width: 200 }}
            value={dictTypeFilter}
            onChange={setDictTypeFilter}
          >
            {dictTypes.map((type) => (
              <Select.Option key={String(type)} value={type}>{type}</Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增字典
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingItem ? '编辑字典' : '新增字典'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingItem(null);
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
          {!editingItem && (
            <>
              <Form.Item
                name="dictType"
                label="字典类型"
                rules={[{ required: true, message: '请输入字典类型' }]}
              >
                <Input placeholder="请输入字典类型，如: product_category" />
              </Form.Item>
              <Form.Item
                name="dictCode"
                label="字典编码"
                rules={[{ required: true, message: '请输入字典编码' }]}
              >
                <Input placeholder="请输入字典编码，如: stairs_climbing" />
              </Form.Item>
            </>
          )}
          {editingItem && (
            <>
              <Form.Item label="字典类型">
                <Input value={editingItem.dictType} disabled />
              </Form.Item>
              <Form.Item label="字典编码">
                <Input value={editingItem.dictCode} disabled />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="dictName"
            label="字典名称"
            rules={[{ required: true, message: '请输入字典名称' }]}
          >
            <Input placeholder="请输入字典名称" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            initialValue={1}
          >
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="sortOrder"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingItem(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictManagement;
