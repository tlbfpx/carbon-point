import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Tabs,
  DatePicker,
  Card,
  Typography,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  getPlatformAdmins,
  createPlatformAdmin,
  updatePlatformAdmin,
  deletePlatformAdmin,
  getOperationLogs,
  PlatformAdmin,
} from '@/shared/api/platform';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const SystemManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('admins');
  const [form] = Form.useForm();

  // Admin modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<'create' | 'edit'>('create');
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdmin | null>(null);

  // Admin pagination
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(10);

  // Log filter state
  const [logFilterForm] = Form.useForm();
  const [logPage, setLogPage] = useState(1);
  const [logFilters, setLogFilters] = useState<{
    operatorKeyword?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // ---- Admin queries ----
  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: getPlatformAdmins,
  });

  // ---- Log queries ----
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['operation-logs', logPage, logFilters],
    queryFn: () =>
      getOperationLogs({
        page: logPage,
        size: 10,
        operatorId: logFilters.operatorKeyword,
        actionType: logFilters.actionType,
        startDate: logFilters.startDate,
        endDate: logFilters.endDate,
      }),
    enabled: activeTab === 'logs',
  });

  // ---- Admin mutations ----
  const createAdminMutation = useMutation({
    mutationFn: createPlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('管理员创建成功');
        setAdminModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: {
        username?: string;
        phone?: string;
        email?: string;
        roles?: string[];
        status?: number;
      };
    }) => updatePlatformAdmin(userId, data),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('管理员更新成功');
        setAdminModalOpen(false);
        setEditingAdmin(null);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '更新失败');
      }
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: deletePlatformAdmin,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('管理员已删除');
        queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      } else {
        message.error(res.message || '删除失败');
      }
    },
  });

  // ---- Handlers ----
  const openCreateModal = () => {
    setAdminModalMode('create');
    setEditingAdmin(null);
    form.resetFields();
    setAdminModalOpen(true);
  };

  const openEditModal = (record: PlatformAdmin) => {
    setAdminModalMode('edit');
    setEditingAdmin(record);
    form.setFieldsValue({
      username: record.username,
      phone: record.phone,
      email: record.email,
      roles: record.roles,
    });
    setAdminModalOpen(true);
  };

  const handleAdminFormFinish = (values: {
    username: string;
    phone: string;
    password?: string;
    email?: string;
    roles: string[];
  }) => {
    if (adminModalMode === 'create') {
      createAdminMutation.mutate(values as { username: string; phone: string; password: string; email?: string; roles: string[] });
    } else if (editingAdmin) {
      const { password, ...rest } = values;
      updateAdminMutation.mutate({
        userId: editingAdmin.userId,
        data: rest as { username?: string; phone?: string; email?: string; roles?: string[] },
      });
    }
  };

  const handleLogSearch = (values: {
    operatorKeyword?: string;
    actionType?: string;
    dateRange?: [Dayjs, Dayjs];
  }) => {
    setLogPage(1);
    setLogFilters({
      operatorKeyword: values.operatorKeyword,
      actionType: values.actionType,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: values.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
    });
  };

  const handleLogReset = () => {
    logFilterForm.resetFields();
    setLogPage(1);
    setLogFilters({});
  };

  // ---- Columns ----
  const roleColorMap: Record<string, string> = {
    super_admin: 'red',
    admin: 'orange',
    viewer: 'blue',
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '运营管理员',
    viewer: '只读管理员',
  };

  const adminColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: '手机号', dataIndex: 'phone' },
    { title: '邮箱', dataIndex: 'email', render: (v?: string) => v || '-' },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: string[]) => (
        <>
          {roles?.map((r) => (
            <Tag key={r} color={roleColorMap[r] || 'default'}>
              {roleLabelMap[r] || r}
            </Tag>
          )) || '-'}
        </>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '正常' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      render: (t?: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, record: PlatformAdmin) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该管理员？"
            description="删除后不可恢复"
            onConfirm={() => deleteAdminMutation.mutate(record.userId)}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const actionTypeOptions = [
    { value: 'LOGIN', label: '登录' },
    { value: 'CREATE', label: '创建' },
    { value: 'UPDATE', label: '更新' },
    { value: 'DELETE', label: '删除' },
    { value: 'ENABLE', label: '启用' },
    { value: 'DISABLE', label: '禁用' },
  ];

  const logColumns = [
    {
      title: '操作人',
      dataIndex: 'operatorName',
      render: (v?: string) => v || '-',
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      render: (v: string) => {
        const colorMap: Record<string, string> = {
          LOGIN: 'cyan',
          CREATE: 'green',
          UPDATE: 'blue',
          DELETE: 'red',
          ENABLE: 'green',
          DISABLE: 'orange',
        };
        return <Tag color={colorMap[v] || 'default'}>{v || '-'}</Tag>;
      },
    },
    { title: '操作内容', dataIndex: 'description', ellipsis: true },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      render: (ip?: string) => (
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {ip || '-'}
        </Text>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  // Compute admin list with pagination
  const adminRecords = adminsData?.data?.records || adminsData?.data || [];
  const paginatedAdmins = adminRecords.slice(
    (adminPage - 1) * adminPageSize,
    adminPage * adminPageSize
  );

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统管理</h2>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (key === 'logs') {
            refetchLogs();
          }
        }}
        items={[
          {
            key: 'admins',
            label: '平台管理员',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreateModal}
                  >
                    创建管理员
                  </Button>
                </Space>

                <Table
                  columns={adminColumns}
                  dataSource={paginatedAdmins}
                  rowKey="userId"
                  loading={adminsLoading}
                  pagination={{
                    current: adminPage,
                    pageSize: adminPageSize,
                    total: adminRecords.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (p, ps) => {
                      setAdminPage(p);
                      setAdminPageSize(ps);
                    },
                  }}
                />
              </div>
            ),
          },
          {
            key: 'logs',
            label: '操作日志',
            children: (
              <div>
                {/* Filter Card */}
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Form
                    form={logFilterForm}
                    layout="inline"
                    onFinish={handleLogSearch}
                  >
                    <Form.Item name="operatorKeyword" label="操作人">
                      <Input
                        placeholder="搜索操作人"
                        allowClear
                        style={{ width: 160 }}
                        prefix={<SearchOutlined />}
                      />
                    </Form.Item>
                    <Form.Item name="actionType" label="操作类型">
                      <Select
                        placeholder="请选择"
                        allowClear
                        style={{ width: 140 }}
                        options={actionTypeOptions}
                      />
                    </Form.Item>
                    <Form.Item name="dateRange" label="时间范围">
                      <RangePicker />
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                          查询
                        </Button>
                        <Button onClick={handleLogReset}>重置</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => refetchLogs()}>
                          刷新
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>

                <Table
                  columns={logColumns}
                  dataSource={logsData?.data?.records || logsData?.data || []}
                  rowKey="id"
                  loading={logsLoading}
                  pagination={{
                    current: logPage,
                    pageSize: 10,
                    total: logsData?.data?.total || logsData?.data?.records?.length || 0,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (p) => {
                      setLogPage(p);
                    },
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Admin Create / Edit Modal */}
      <Modal
        title={adminModalMode === 'create' ? '创建平台管理员' : '编辑平台管理员'}
        open={adminModalOpen}
        onCancel={() => {
          setAdminModalOpen(false);
          setEditingAdmin(null);
          form.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdminFormFinish}
          initialValues={{ roles: [] }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          {adminModalMode === 'create' && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}
          <Form.Item name="email" label="邮箱">
            <Input type="email" placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            name="roles"
            label="角色"
            rules={[{ required: true, message: '请选择角色', type: 'array' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={[
                { value: 'super_admin', label: '超级管理员' },
                { value: 'admin', label: '运营管理员' },
                { value: 'viewer', label: '只读管理员' },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createAdminMutation.isPending || updateAdminMutation.isPending}
              >
                {adminModalMode === 'create' ? '确认创建' : '保存修改'}
              </Button>
              <Button onClick={() => setAdminModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemManagement;
