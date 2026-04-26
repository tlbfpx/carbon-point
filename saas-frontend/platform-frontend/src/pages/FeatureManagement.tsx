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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  Feature,
} from '@/api/platform';
import { extractArray } from '@/utils';

const typeLabels: Record<string, { text: string; color: string }> = {
  permission: { text: '权限', color: 'blue' },
  config: { text: '配置', color: 'purple' },
};

const valueTypeLabels: Record<string, { text: string; color: string }> = {
  boolean: { text: '布尔', color: 'green' },
  number: { text: '数值', color: 'orange' },
  string: { text: '字符串', color: 'default' },
  json: { text: 'JSON', color: 'cyan' },
};

const FeatureManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Feature | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();

  const { data: featureData, isLoading } = useQuery({
    queryKey: ['features', typeFilter, groupFilter, keyword],
    queryFn: () => getFeatures({ type: typeFilter, group: groupFilter, keyword, size: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (err: any) => message.error(err?.message || '创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFeature(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalOpen(false);
      setEditingItem(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (err: any) => message.error(err?.message || '更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (err: any) => message.error(err?.message || '删除失败'),
  });

  const openCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: Feature) => {
    setEditingItem(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      valueType: record.valueType || 'boolean',
      defaultValue: record.defaultValue,
      description: record.description,
      group: record.group,
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

  const items = extractArray<Feature>(featureData);
  const groups = Array.from(new Set(items.map((f: Feature) => f.group).filter(Boolean))) as string[];

  const columns = [
    {
      title: '编码',
      dataIndex: 'code',
      width: 180,
      render: (code: string) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{code}</span>,
    },
    { title: '名称', dataIndex: 'name', width: 140 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => {
        const t = typeLabels[type];
        return t ? <Tag color={t.color}>{t.text}</Tag> : type;
      },
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 90,
      render: (vt: string) => {
        const t = valueTypeLabels[vt || 'boolean'];
        return t ? <Tag color={t.color}>{t.text}</Tag> : vt;
      },
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      width: 120,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '分组',
      dataIndex: 'group',
      width: 100,
      render: (g: string) => g ? <Tag>{g}</Tag> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 110,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: Feature) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？删除后不可恢复" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消">
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>功能配置项</h2>
        <Space>
          <Select
            placeholder="类型筛选"
            allowClear
            style={{ width: 120 }}
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Select.Option value="permission">权限</Select.Option>
            <Select.Option value="config">配置</Select.Option>
          </Select>
          <Select
            placeholder="分组筛选"
            allowClear
            style={{ width: 140 }}
            value={groupFilter}
            onChange={setGroupFilter}
          >
            {groups.map((g) => (
              <Select.Option key={g} value={g}>{g}</Select.Option>
            ))}
          </Select>
          <Input.Search
            placeholder="搜索编码/名称"
            allowClear
            style={{ width: 200 }}
            onSearch={setKeyword}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增功能项
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
        title={editingItem ? '编辑功能项' : '新增功能项'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingItem(null); form.resetFields(); }}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          {editingItem ? (
            <Form.Item label="编码">
              <Input value={editingItem.code} disabled />
            </Form.Item>
          ) : (
            <Form.Item
              name="code"
              label="编码"
              rules={[{ required: true, message: '请输入功能编码' }]}
              extra="唯一标识，创建后不可修改"
            >
              <Input placeholder="如: streak_bonus" style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入功能名称' }]}
          >
            <Input placeholder="如: 连续打卡奖励" />
          </Form.Item>
          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true }]}
              initialValue="permission"
              style={{ width: 200 }}
            >
              <Select>
                <Select.Option value="permission">权限（开关）</Select.Option>
                <Select.Option value="config">配置（有值）</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="valueType"
              label="值类型"
              initialValue="boolean"
              style={{ width: 200 }}
            >
              <Select>
                <Select.Option value="boolean">布尔</Select.Option>
                <Select.Option value="number">数值</Select.Option>
                <Select.Option value="string">字符串</Select.Option>
                <Select.Option value="json">JSON</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.valueType !== curr.valueType}>
            {({ getFieldValue, setFieldsValue }) => {
              const valueType = getFieldValue('valueType');

              if (valueType === 'boolean') {
                return (
                  <Form.Item name="defaultValue" label="默认值">
                    <Select placeholder="请选择">
                      <Select.Option value="true">开启 (true)</Select.Option>
                      <Select.Option value="false">关闭 (false)</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }

              if (valueType === 'number') {
                return (
                  <Form.Item name="defaultValue" label="默认值">
                    <InputNumber style={{ width: '100%' }} placeholder="请输入数字" />
                  </Form.Item>
                );
              }

              if (valueType === 'json') {
                return (
                  <Form.Item name="defaultValue" label="默认值">
                    <Input.TextArea rows={4} placeholder='请输入JSON配置，如: {"key": "value"}' />
                  </Form.Item>
                );
              }

              return (
                <Form.Item name="defaultValue" label="默认值">
                  <Input placeholder="请输入文本" />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="group" label="分组">
            <Input placeholder="如: checkin、exchange（选填）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="功能描述（选填）" />
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

export default FeatureManagement;
