import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tag,
  Switch,
  Tree,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPlatformRoles,
  createPlatformRole,
  updatePlatformRole,
  deletePlatformRole,
  getPlatformRolePermissions,
  updatePlatformRolePermissions,
  getPlatformPermissions,
  PlatformRole,
  PermissionNode,
} from '@/api/platform';

const SystemRoles: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<PlatformRole | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['platform-roles'],
    queryFn: getPlatformRoles,
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['platform-permissions'],
    queryFn: getPlatformPermissions,
    enabled: permModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createPlatformRole,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updatePlatformRole(id, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('更新成功');
        setModalOpen(false);
        setEditingRole(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlatformRole,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  const updatePermMutation = useMutation({
    mutationFn: ({ id, permissionCodes }: { id: string; permissionCodes: string[] }) =>
      updatePlatformRolePermissions(id, permissionCodes),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('权限更新成功');
        setPermModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const openCreateModal = () => {
    setEditingRole(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: PlatformRole) => {
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      status: record.status,
    });
    setModalOpen(true);
  };

  const openPermModal = async (record: PlatformRole) => {
    setSelectedRole(record);
    try {
      const permData = await getPlatformRolePermissions(record.id);
      setCheckedKeys(permData.data || []);
    } catch {
      setCheckedKeys([]);
    }
    setPermModalOpen(true);
  };

  const handleFormFinish = (values: any) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handlePermSave = () => {
    if (selectedRole) {
      updatePermMutation.mutate({
        id: selectedRole.id,
        permissionCodes: checkedKeys as string[],
      });
    }
  };

  const columns = [
    { title: '角色编码', dataIndex: 'code' },
    { title: '角色名称', dataIndex: 'name' },
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
    { title: '权限数', dataIndex: 'permissionCount' },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: PlatformRole) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => openPermModal(record)}>
            配置权限
          </Button>
          {record.code !== 'super_admin' && (
            <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const roles = rolesData?.data || rolesData?.data?.records || [];
  const permissionTree = permissionsData?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>角色管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增角色
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingRole(null);
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
          {!editingRole && (
            <Form.Item
              name="code"
              label="角色编码"
              rules={[{ required: true, message: '请输入角色编码' }]}
            >
              <Input placeholder="请输入角色编码，如: admin" />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述（选填）" />
          </Form.Item>
          {editingRole && (
            <Form.Item
              name="status"
              label="状态"
              valuePropName="checked"
              getValueFromEvent={(checked) => checked ? 1 : 0}
              getValueProps={(value) => ({ checked: value === 1 })}
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingRole ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingRole(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`配置权限 - ${selectedRole?.name}`}
        open={permModalOpen}
        onCancel={() => { setPermModalOpen(false); setSelectedRole(null); }}
        onOk={handlePermSave}
        confirmLoading={updatePermMutation.isPending}
        width={600}
      >
        <Tree
          checkable
          treeData={permissionTree}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(keys as React.Key[])}
          fieldNames={{ title: 'label', key: 'key', children: 'children' }}
        />
      </Modal>
    </div>
  );
};

export default SystemRoles;
