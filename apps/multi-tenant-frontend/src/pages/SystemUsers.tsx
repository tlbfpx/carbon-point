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
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPlatformAdmins,
  createPlatformAdmin,
  updatePlatformAdmin,
  deletePlatformAdmin,
  PlatformAdmin,
} from '@/api/platform';
import { extractArray } from '@/utils';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: '超级管理员', color: 'gold' },
  { value: 'admin', label: '管理员', color: 'blue' },
  { value: 'viewer', label: '查看者', color: 'default' },
] as const;

const SystemUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformAdmin | null>(null);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<PlatformAdmin | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  const { data: usersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: getPlatformAdmins,
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  React.useEffect(() => {
    if (isError) message.error('加载用户列表失败');
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: createPlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      updatePlatformAdmin(userId, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('更新成功');
        setModalOpen(false);
        setEditingUser(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '删除失败');
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: PlatformAdmin) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      phone: record.phone,
      email: record.email,
      role: record.roles?.[0] ?? null,
      status: record.status,
    });
    setModalOpen(true);
  };

  const openResetPasswordModal = (record: PlatformAdmin) => {
    setResetPasswordTarget(record);
    resetForm.resetFields();
    setResetPasswordModalOpen(true);
  };

  const handleFormFinish = (values: any) => {
    if (editingUser) {
      updateMutation.mutate({ userId: editingUser.userId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleResetPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    if (values.newPassword.length < 6) {
      message.error('密码长度不能少于6位');
      return;
    }

    setResetPasswordLoading(true);
    try {
      // Call reset password API
      const res = await updatePlatformAdmin(resetPasswordTarget!.userId, {
        newPassword: values.newPassword,
      });
      if (res.code === 200 || res.code === 0) {
        message.success('密码重置成功');
        setResetPasswordModalOpen(false);
        setResetPasswordTarget(null);
        resetForm.resetFields();
      } else {
        message.error(res.message || '重置失败');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '重置失败');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const option = ROLE_OPTIONS.find((opt) => opt.value === role);
    return option?.label || role;
  };

  const getRoleColor = (role: string) => {
    const option = ROLE_OPTIONS.find((opt) => opt.value === role);
    return option?.color || 'default';
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (phone: string) => phone || '-' },
    { title: '邮箱', dataIndex: 'email', ellipsis: true, render: (email: string) => email || '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 140,
      render: (roles: string[]) => (
        <Space wrap>
          {roles?.map((role) => (
            <Tag key={role} color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      width: 160,
      render: (t: string) => t ? (
        <Tooltip title={dayjs(t).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(t).format('YYYY-MM-DD HH:mm')}
        </Tooltip>
      ) : '从未登录',
    },
    { title: '创建时间', dataIndex: 'createTime', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '操作',
      width: 240,
      render: (_: unknown, record: PlatformAdmin) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<LockOutlined />} onClick={() => openResetPasswordModal(record)}>
            重置密码
          </Button>
          {!record.roles?.includes(ROLE_OPTIONS[0].value) && (
            <Popconfirm
              title="确认删除该管理员？"
              description="删除后该管理员将无法登录"
              onConfirm={() => deleteMutation.mutate(record.userId)}
              okText="确认"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const users = extractArray<PlatformAdmin>(usersData);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增用户
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="userId"
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormFinish}
        >
          {!editingUser && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, max: 32, message: '用户名长度为 2-32 个字符' },
                ]}
              >
                <Input placeholder="请输入用户名" maxLength={32} />
              </Form.Item>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" maxLength={11} />
              </Form.Item>
              <Form.Item
                name="password"
                label="初始密码"
                rules={[
                  { required: true, message: '请输入初始密码' },
                  { min: 6, message: '密码至少 6 个字符' },
                ]}
              >
                <Input.Password placeholder="请输入初始密码" />
              </Form.Item>
            </>
          )}
          {editingUser && (
            <>
              <Form.Item label="用户名">
                <Input value={editingUser.username} disabled />
              </Form.Item>
              <Form.Item label="手机号">
                <Input value={editingUser.phone || '-'} disabled />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入正确的邮箱' }]}
          >
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              {ROLE_OPTIONS.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Select.Option value="1">正常</Select.Option>
                <Select.Option value="0">停用</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingUser ? '保存修改' : '确认创建'}
              </Button>
              <Button onClick={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`重置密码 - ${resetPasswordTarget?.username}`}
        open={resetPasswordModalOpen}
        onCancel={() => {
          setResetPasswordModalOpen(false);
          setResetPasswordTarget(null);
          resetForm.resetFields();
        }}
        footer={null}
        width={420}
        destroyOnClose
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请再次输入密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={resetPasswordLoading}>
                确认重置
              </Button>
              <Button onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordTarget(null);
                resetForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemUsers;