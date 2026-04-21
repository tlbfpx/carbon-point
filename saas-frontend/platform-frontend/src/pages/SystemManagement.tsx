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
  Typography,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getPlatformAdmins,
  createPlatformAdmin,
  updatePlatformAdmin,
  deletePlatformAdmin,
  PlatformAdmin,
  getOperationLogs,
  OperationLog,
} from '@/api/platform';
import { SearchOutlined, EyeOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';

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

  // Log pagination & search
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [logSearchOperator, setLogSearchOperator] = useState('');
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

  // ---- Admin queries ----
  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: getPlatformAdmins,
  });

  // ---- Log queries ----
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['operation-logs', logPage, logPageSize, logSearchOperator],
    queryFn: () => {
      const params: { page: number; size: number; adminId?: string } = { page: logPage, size: logPageSize };
      if (logSearchOperator) params.adminId = logSearchOperator;
      return getOperationLogs(params);
    },
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
    CREATE: { label: '创建', color: 'green' },
    UPDATE: { label: '更新', color: 'blue' },
    DELETE: { label: '删除', color: 'red' },
    LOGIN: { label: '登录', color: 'cyan' },
    LOGOUT: { label: '登出', color: 'default' },
    EXPORT: { label: '导出', color: 'purple' },
    IMPORT: { label: '导入', color: 'orange' },
  };

  const logColumns = [
    { title: '操作人', dataIndex: 'adminName', width: 120, render: (v: string) => v || '-' },
    {
      title: '操作类型', dataIndex: 'operationType', width: 100,
      render: (type: string) => {
        const cfg = ACTION_TYPE_MAP[type] || { label: type, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    { title: '操作对象', dataIndex: 'operationObject', width: 140, ellipsis: true },
    { title: 'IP地址', dataIndex: 'ipAddress', width: 140 },
    { title: '操作时间', dataIndex: 'createdAt', width: 170, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    {
      title: '操作', width: 80,
      render: (_: unknown, record: OperationLog) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedLog(record); setLogDetailOpen(true); }}>
          详情
        </Button>
      ),
    },
  ];

  const logRecords = logsData?.data?.records || logsData?.data || [];
  const logTotal = logsData?.data?.total || logRecords.length;

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
      createAdminMutation.mutate({
        username: values.username,
        phone: values.phone,
        password: values.password!,
        email: values.email,
        // Backend expects single role, UI sends array; take first selected
        role: Array.isArray(values.roles) ? values.roles[0] : values.roles,
      });
    } else if (editingAdmin) {
      const { password, ...rest } = values;
      updateAdminMutation.mutate({
        userId: editingAdmin.userId,
        data: rest as { username?: string; phone?: string; email?: string; roles?: string[] },
      });
    }
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
        onChange={setActiveTab}
        items={[
          {
            key: 'admins',
            label: '平台管理员',
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateModal}
                    >
                      创建管理员
                    </Button>
                  </Space>
                </div>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Space>
                    <Input
                      placeholder="操作人ID"
                      value={logSearchOperator}
                      onChange={(e) => setLogSearchOperator(e.target.value)}
                      style={{ width: 150 }}
                      onPressEnter={() => { setLogPage(1); refetchLogs(); }}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => { setLogPage(1); refetchLogs(); }}>
                      查询
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={() => refetchLogs()}>
                      刷新
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={logColumns}
                  dataSource={logRecords}
                  rowKey="id"
                  loading={logsLoading}
                  pagination={{
                    current: logPage,
                    pageSize: logPageSize,
                    total: logTotal,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (p, ps) => {
                      setLogPage(p);
                      setLogPageSize(ps || 10);
                    },
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Log Detail Modal */}
      <Modal
        title="操作日志详情"
        open={logDetailOpen}
        onCancel={() => setLogDetailOpen(false)}
        footer={[<Button key="close" onClick={() => setLogDetailOpen(false)}>关闭</Button>]}
        width={600}
      >
        {selectedLog && (
          <div style={{ lineHeight: 2.2 }}>
            <p><strong>操作人：</strong>{selectedLog.adminName || '-'}</p>
            <p><strong>操作类型：</strong>{ACTION_TYPE_MAP[selectedLog.operationType]?.label || selectedLog.operationType || '-'}</p>
            <p><strong>操作对象：</strong>{selectedLog.operationObject || '-'}</p>
            <p><strong>IP地址：</strong>{selectedLog.ipAddress || '-'}</p>
            <p><strong>操作时间：</strong>{selectedLog.createdAt ? dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
          </div>
        )}
      </Modal>

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
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}>
            <Input placeholder="请输入邮箱（选填）" />
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
              <Button onClick={() => { setAdminModalOpen(false); setEditingAdmin(null); form.resetFields(); }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemManagement;
