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
  getFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  Feature,
} from '@/api/platform';

const FeatureLibrary: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [groupFilter, setGroupFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [form] = Form.useForm();

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ['features', page, pageSize, typeFilter, groupFilter],
    queryFn: () => getFeatures({ page, size: pageSize, type: typeFilter, group: groupFilter }),
  });

  const createMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['features'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateFeature(id, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('更新成功');
        setModalOpen(false);
        setEditingFeature(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['features'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeature,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['features'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  const openCreateModal = () => {
    setEditingFeature(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: Feature) => {
    setEditingFeature(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      group: record.group,
      defaultValue: record.defaultValue,
    });
    setModalOpen(true);
  };

  const handleFormFinish = (values: any) => {
    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: '功能点编码', dataIndex: 'code' },
    { title: '功能点名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: string) => (
        <Tag color={type === 'permission' ? 'blue' : 'orange'}>
          {type === 'permission' ? '权限' : '配置'}
        </Tag>
      ),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      render: (valueType: string) => valueType ? <Tag>{valueType}</Tag> : '-',
    },
    { title: '分组', dataIndex: 'group', render: (group: string) => group ? <Tag>{group}</Tag> : '-' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: Feature) => (
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

  const features = featuresData?.data?.records || featuresData?.data || [];
  const total = featuresData?.data?.total || features.length;

  // Extract unique groups for filter
  const groups = Array.from(new Set(features.map((f: Feature) => f.group).filter(Boolean))) as string[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>功能点库</h2>
        <Space>
          <Select
            placeholder="筛选类型"
            allowClear
            style={{ width: 120 }}
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Select.Option value="permission">权限</Select.Option>
            <Select.Option value="config">配置</Select.Option>
          </Select>
          <Select
            placeholder="筛选分组"
            allowClear
            style={{ width: 150 }}
            value={groupFilter}
            onChange={setGroupFilter}
          >
            {groups.map((group: string) => (
              <Select.Option key={group} value={group}>{group}</Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增功能点
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={features}
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
        title={editingFeature ? '编辑功能点' : '新增功能点'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingFeature(null);
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
          {!editingFeature && (
            <>
              <Form.Item
                name="code"
                label="功能点编码"
                rules={[{ required: true, message: '请输入功能点编码' }]}
              >
                <Input placeholder="请输入功能点编码，如: checkin:view" />
              </Form.Item>
              <Form.Item
                name="type"
                label="功能点类型"
                rules={[{ required: true, message: '请选择功能点类型' }]}
              >
                <Select placeholder="请选择功能点类型">
                  <Select.Option value="permission">权限</Select.Option>
                  <Select.Option value="config">配置</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.type !== curr.type}
              >
                {({ getFieldValue }) =>
                  getFieldValue('type') === 'config' && (
                    <Form.Item
                      name="valueType"
                      label="值类型"
                      rules={[{ required: true, message: '请选择值类型' }]}
                    >
                      <Select placeholder="请选择值类型">
                        <Select.Option value="boolean">布尔值</Select.Option>
                        <Select.Option value="number">数字</Select.Option>
                        <Select.Option value="string">字符串</Select.Option>
                        <Select.Option value="json">JSON</Select.Option>
                      </Select>
                    </Form.Item>
                  )
                }
              </Form.Item>
            </>
          )}
          {editingFeature && (
            <>
              <Form.Item label="功能点编码">
                <Input value={editingFeature.code} disabled />
              </Form.Item>
              <Form.Item label="功能点类型">
                <Tag color={editingFeature.type === 'permission' ? 'blue' : 'orange'}>
                  {editingFeature.type === 'permission' ? '权限' : '配置'}
                </Tag>
              </Form.Item>
              {editingFeature.valueType && (
                <Form.Item label="值类型">
                  <Tag>{editingFeature.valueType}</Tag>
                </Form.Item>
              )}
            </>
          )}
          <Form.Item
            name="name"
            label="功能点名称"
            rules={[{ required: true, message: '请输入功能点名称' }]}
          >
            <Input placeholder="请输入功能点名称" />
          </Form.Item>
          <Form.Item
            name="group"
            label="分组"
          >
            <Input placeholder="分组（选填，用于分类展示）" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => {
              const prevType = editingFeature ? editingFeature.type : prev.type;
              const currType = editingFeature ? editingFeature.type : curr.type;
              return prevType !== currType || prev.defaultValue !== curr.defaultValue;
            }}
          >
            {({ getFieldValue }) => {
              const currentType = editingFeature ? editingFeature.type : getFieldValue('type');
              return currentType === 'config' && (
                <Form.Item
                  name="defaultValue"
                  label="系统默认值"
                >
                  <Input.TextArea rows={2} placeholder="系统默认值（选填）" />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述（选填）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingFeature ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingFeature(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeatureLibrary;
