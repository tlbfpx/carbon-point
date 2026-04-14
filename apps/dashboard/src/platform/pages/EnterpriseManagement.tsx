import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Popconfirm,
  message,
  Select,
  Alert,
  Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, CrownOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getEnterprises,
  createEnterprise,
  toggleEnterpriseStatus,
  getPackages,
  updateTenantPackage,
  getEnterpriseUsers,
  assignSuperAdmin,
  Enterprise,
  EnterpriseUser,
} from '@/shared/api/platform';

const EnterpriseManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>();
  const [packageChangeConfirmOpen, setPackageChangeConfirmOpen] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState('info');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['enterprises', page, keyword, statusFilter],
    queryFn: () => getEnterprises({ page, size: 10, keyword, status: statusFilter }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: () => getPackages({ size: 100 }),
  });

  // Move useQuery to component top-level to comply with React Hooks rules
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['enterprise-users', editingEnterprise?.id],
    queryFn: () => getEnterpriseUsers(editingEnterprise?.id!),
    enabled: !!editingEnterprise?.id,
  });

  const createMutation = useMutation({
    mutationFn: createEnterprise,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('企业创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => toggleEnterpriseStatus(id, status),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ tenantId, packageId }: { tenantId: string; packageId: string }) =>
      updateTenantPackage(tenantId, packageId),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐更换成功');
        setPackageChangeConfirmOpen(false);
        setDetailModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      } else {
        message.error(res.message || '套餐更换失败');
      }
    },
  });

  const assignSuperAdminMutation = useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      assignSuperAdmin(tenantId, userId),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('超级管理员分配成功');
        queryClient.invalidateQueries({ queryKey: ['enterprise-users', editingEnterprise?.id] });
      } else {
        message.error(res.message || '分配失败');
      }
    },
  });

  const openDetail = (record: Enterprise) => {
    setEditingEnterprise(record);
    setSelectedPackageId(record.packageId);
    setDetailActiveTab('info');
    setDetailModalOpen(true);
  };

  const handlePackageChange = (newPackageId: string) => {
    setSelectedPackageId(newPackageId);
    setPackageChangeConfirmOpen(true);
  };

  const handlePackageConfirm = () => {
    if (editingEnterprise && selectedPackageId) {
      updatePackageMutation.mutate({
        tenantId: editingEnterprise.id,
        packageId: selectedPackageId,
      });
    }
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setEditingEnterprise(null);
    setSelectedPackageId(undefined);
    setDetailActiveTab('info');
  };

  const columns = [
    { title: '企业名称', dataIndex: 'name' },
    { title: '联系人', dataIndex: 'contactName' },
    { title: '联系电话', dataIndex: 'contactPhone' },
    {
      title: '套餐',
      dataIndex: 'packageName',
      render: (v: string) => (
        <Tag color={v ? 'blue' : 'default'}>{v || '未绑定'}</Tag>
      ),
    },
    { title: '用户数', dataIndex: 'userCount' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作',
      render: (_: unknown, record: Enterprise) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '停用' : '开通'}该企业？`}
            onConfirm={() =>
              toggleMutation.mutate({
                id: record.id,
                status: record.status === 'active' ? 'inactive' : 'active',
              })
            }
          >
            <Button type="link" size="small">
              {record.status === 'active' ? '停用' : '开通'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const packageOptions = (packagesData?.data?.records || packagesData?.data || [])
    .filter((p: { status: number }) => p.status === 1)
    .map((p: { id: string; name: string }) => ({ value: p.id, label: p.name }));

  const userColumns = [
    { title: '姓名', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '角色',
      dataIndex: 'roleNames',
      render: (roleNames: string[], record: EnterpriseUser) => (
        <Space wrap>
          {roleNames.map((name) => (
            <Tag key={name} color={record.isSuperAdmin ? 'gold' : 'blue'}>{name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: EnterpriseUser) => (
        record.isSuperAdmin ? (
          <Tag icon={<CrownOutlined />} color="gold">当前超管</Tag>
        ) : (
          <Popconfirm
            title={`确认将「${record.username}」设为企业超级管理员？`}
            onConfirm={() => {
              if (!editingEnterprise) return;
              assignSuperAdminMutation.mutate({
                tenantId: editingEnterprise.id,
                userId: record.userId,
              });
            }}
          >
            <Button type="link" size="small" icon={<CrownOutlined />}>
              设为超管
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];

  const renderDetailInfo = () => {
    if (!editingEnterprise) return null;
    return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h4>基本信息</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          <div><strong>企业名称：</strong>{editingEnterprise.name}</div>
          <div><strong>联系人：</strong>{editingEnterprise.contactName}</div>
          <div><strong>联系电话：</strong>{editingEnterprise.contactPhone}</div>
          <div><strong>用户数：</strong>{editingEnterprise.userCount}</div>
          <div><strong>创建时间：</strong>{dayjs(editingEnterprise.createTime).format('YYYY-MM-DD')}</div>
          <div>
            <strong>状态：</strong>
            <Tag color={editingEnterprise.status === 'active' ? 'green' : 'red'}>
              {editingEnterprise.status === 'active' ? '正常' : '停用'}
            </Tag>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4>套餐管理</h4>
        <Form layout="vertical">
          <Form.Item label="当前套餐">
            <Select
              value={selectedPackageId}
              onChange={handlePackageChange}
              placeholder="请选择套餐"
              options={packageOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </div>

      <Alert
        type="info"
        showIcon
        message="套餐更换说明"
        description="套餐更换后，运营角色超出新套餐的权限将被自动清理，确认更换？"
        style={{ marginBottom: 16 }}
      />
    </div>
  );
};

   const renderDetailUsers = () => {
     const users = usersData?.data || usersData?.data?.records || [];

     return (
       <div>
         <Alert
           type="info"
           showIcon
           message="企业超级管理员说明"
           description="超级管理员拥有企业最高权限，可管理企业内的所有功能。每个企业必须至少保留一名超级管理员。"
           style={{ marginBottom: 16 }}
         />
         <Table
           columns={userColumns}
           dataSource={users}
           rowKey="userId"
           loading={usersLoading}
           pagination={false}
           size="small"
         />
       </div>
     );
   };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>企业管理</h2>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索企业名称"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 240 }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPage(1); }}
          options={[
            { value: 'active', label: '正常' },
            { value: 'inactive', label: '停用' },
          ]}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          开通企业
        </Button>
      </Space>

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
        }}
      />

      {/* Create Enterprise Modal */}
      <Modal
        title="开通企业"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const allPackages = (packagesData?.data?.records || packagesData?.data || []);
            const selectedPkg = allPackages.find((p: { id: string }) => p.id === values.packageId);
            createMutation.mutate({
              ...values,
              packageName: selectedPkg?.name,
            });
          }}
        >
          <Form.Item name="name" label="企业名称" rules={[{ required: true, message: '请输入企业名称' }]}>
            <Input placeholder="请输入企业名称" />
          </Form.Item>
          <Form.Item name="contactName" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="packageId" label="选择套餐">
            <Select
              placeholder="请选择套餐"
              allowClear
              options={packageOptions}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                确认开通
              </Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Enterprise Detail Modal */}
      <Modal
        title="企业详情"
        open={detailModalOpen}
        onCancel={handleCloseDetail}
        footer={null}
        width={640}
      >
        {editingEnterprise && (
          <Tabs
            activeKey={detailActiveTab}
            onChange={setDetailActiveTab}
            items={[
              { key: 'info', label: '基本信息', children: renderDetailInfo() },
              { key: 'users', label: '用户管理', children: renderDetailUsers() },
            ]}
          />
        )}
      </Modal>

      {/* Package Change Confirmation Modal */}
      <Modal
        title="确认更换套餐"
        open={packageChangeConfirmOpen}
        onCancel={() => {
          setPackageChangeConfirmOpen(false);
          setSelectedPackageId(editingEnterprise?.packageId);
        }}
        onOk={handlePackageConfirm}
        confirmLoading={updatePackageMutation.isPending}
        okText="确认更换"
        cancelText="取消"
      >
        <Alert
          type="warning"
          showIcon
          message="套餐更换后，运营角色超出新套餐的权限将被自动清理，确认更换？"
        />
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
            新套餐权限将自动同步到企业超管角色，超出范围的运营角色权限将被移除。
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default EnterpriseManagement;
