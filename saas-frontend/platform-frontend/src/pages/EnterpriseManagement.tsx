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
  Statistic,
  Row,
  Col,
  Empty,
  Spin,
  Typography,
} from 'antd';
import { GlassCard } from '@carbon-point/design-system';
import {
  PlusOutlined,
  EditOutlined,
  CrownOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
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
  getPlatformStats,
  getTenantProducts,
  Enterprise,
  EnterpriseUser,
  TenantProductInfo,
} from '@/api/platform';
import { extractArray } from '@/utils';

const { Text } = Typography;

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

  const CATEGORY_COLOR_MAP: Record<string, string> = {
    stairs_climbing: 'blue',
    walking: 'green',
  };
  const CATEGORY_LABEL_MAP: Record<string, string> = {
    stairs_climbing: '爬楼打卡',
    walking: '走路计步',
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['enterprises', page, keyword, statusFilter],
    queryFn: () => getEnterprises({ page, size: 10, keyword, status: statusFilter }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: () => getPackages({ size: 100 }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: getPlatformStats,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['enterprise-users', editingEnterprise?.id],
    queryFn: () => getEnterpriseUsers(editingEnterprise!.id),
    enabled: !!editingEnterprise?.id,
  });

  const { data: tenantProductsData, isLoading: tenantProductsLoading } = useQuery({
    queryKey: ['tenant-products', editingEnterprise?.id],
    queryFn: () => getTenantProducts(editingEnterprise!.id),
    enabled: !!editingEnterprise?.id && detailModalOpen && detailActiveTab === 'products',
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createEnterprise,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('企业创建成功');
        setModalOpen(false);
        form.resetFields();
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      } else {
        message.error(res.message || '创建失败');
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      toggleEnterpriseStatus(id, status),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('状态更新成功');
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      } else {
        message.error(res.message || '状态更新失败');
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '状态更新失败');
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ tenantId, packageId }: { tenantId: string; packageId: string }) =>
      updateTenantPackage(tenantId, packageId),
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200 || res.code === 0) {
        message.success('套餐更换成功');
        setPackageChangeConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      } else {
        message.error(res.message || '套餐更换失败');
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '套餐更换失败');
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
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '分配失败');
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
      updatePackageMutation.mutate({ tenantId: editingEnterprise.id, packageId: selectedPackageId });
    }
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setEditingEnterprise(null);
    setSelectedPackageId(undefined);
    setDetailActiveTab('info');
  };

  const stats = statsData?.data;
  const packageOptions = (packagesData?.data?.records || packagesData?.data || [])
    .filter((p: { status: number }) => p.status === 1)
    .map((p: { id: string; name: string }) => ({ value: p.id, label: p.name }));

  const columns = [
    {
      title: '企业名称',
      dataIndex: 'name',
      render: (name: string, record: Enterprise) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.expireTime && (
            <div style={{ fontSize: 12, color: dayjs(record.expireTime).isBefore(dayjs()) ? '#ff4d4f' : '#999' }}>
              {dayjs(record.expireTime).isBefore(dayjs()) ? '已到期' : `到期: ${dayjs(record.expireTime).format('YYYY-MM-DD')}`}
            </div>
          )}
        </div>
      ),
    },
    { title: '联系人', dataIndex: 'contactName', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 140 },
    {
      title: '套餐',
      dataIndex: 'packageName',
      width: 120,
      render: (v: string) => (
        <Tag color={v ? 'blue' : 'default'}>{v || '未绑定'}</Tag>
      ),
    },
    { title: '用户数', dataIndex: 'userCount', width: 80, render: (n: number) => n ?? '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 110,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, record: Enterprise) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '停用' : '开通'}该企业？`}
            icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            onConfirm={() =>
              toggleMutation.mutate({ id: record.id, status: record.status === 'active' ? 'inactive' : 'active' })
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

  const userColumns = [
    { title: '姓名', dataIndex: 'username', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (p: string) => p || '-' },
    {
      title: '角色',
      dataIndex: 'roleNames',
      render: (roleNames: string[], record: EnterpriseUser) => (
        <Space wrap>
          {roleNames?.map((name) => (
            <Tag key={name} color={record.isSuperAdmin ? 'gold' : 'blue'}>{name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: EnterpriseUser) =>
        record.isSuperAdmin ? (
          <Tag icon={<CrownOutlined />} color="gold">当前超管</Tag>
        ) : (
          <Popconfirm
            title={`确认将「${record.username}」设为企业超级管理员？`}
            description="分配后原超级管理员将失去超管权限"
            onConfirm={() => {
              if (!editingEnterprise) return;
              assignSuperAdminMutation.mutate({ tenantId: editingEnterprise.id, userId: record.userId });
            }}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CrownOutlined />}>
              设为超管
            </Button>
          </Popconfirm>
        ),
    },
  ];

  const renderDetailInfo = () => {
    if (!editingEnterprise) return null;
    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic title="用户数" value={editingEnterprise.userCount || 0} />
          </Col>
          <Col span={6}>
            <Statistic title="状态" value={editingEnterprise.status === 'active' ? '正常' : '停用'} />
          </Col>
          <Col span={12}>
            <Statistic title="创建时间" value={editingEnterprise.createTime ? dayjs(editingEnterprise.createTime).format('YYYY-MM-DD') : '-'} />
          </Col>
        </Row>

        <div style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 12 }}>基本信息</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <div><strong>企业名称：</strong>{editingEnterprise.name}</div>
            <div><strong>联系人：</strong>{editingEnterprise.contactName}</div>
            <div><strong>联系电话：</strong>{editingEnterprise.contactPhone}</div>
            <div><strong>联系邮箱：</strong>{editingEnterprise.contactEmail || '-'}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>套餐管理</h4>
          <Form layout="vertical">
            <Form.Item label="当前套餐" style={{ marginBottom: 8 }}>
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
          icon={<ExclamationCircleOutlined />}
          message="套餐更换说明"
          description="套餐更换后，运营角色超出新套餐的权限将被自动清理。"
          style={{ marginBottom: 0 }}
        />
      </div>
    );
  };

  const renderDetailUsers = () => {
    const users = extractArray<EnterpriseUser>(usersData);
    return (
      <div>
        <Alert
          type="info"
          showIcon
          icon={<CrownOutlined />}
          message="企业超级管理员说明"
          description="超级管理员拥有企业最高权限。每个企业必须至少保留一名超级管理员。"
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

  const renderDetailProducts = () => {
    if (tenantProductsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin tip="加载中..." />
        </div>
      );
    }
    const products = tenantProductsData?.data || [];
    if (!products || products.length === 0) {
      return (
        <div>
          <Empty description="该企业尚未启用任何产品，请先绑定套餐" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }
    return (
      <div>
        <Alert
          type="info"
          showIcon
          icon={<AppstoreOutlined />}
          message="已启用产品"
          description="以下产品由企业绑定的套餐决定，更换套餐将自动更新可用产品列表。"
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {products.map((product: TenantProductInfo) => (
            <GlassCard
              key={product.productId || product.productCode}
              size="small"
              hoverable
              style={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{product.productName}</div>
                  <Space size={4}>
                    <Tag color={CATEGORY_COLOR_MAP[product.category] || 'default'}>
                      {CATEGORY_LABEL_MAP[product.category] || product.category}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{product.productCode}</Text>
                  </Space>
                </div>
              </div>
              {product.featureConfig && Object.keys(product.featureConfig).length > 0 && (
                <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>功能配置:</Text>
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(product.featureConfig).map(([key, value]) => (
                      <Tag key={key} style={{ fontSize: 11 }}>{key}: {String(value)}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    );
  };

  const total = data?.data?.total || 0;
  const records = data?.data?.records || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>企业管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['platform-stats'] }); }}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            开通企业
          </Button>
        </Space>
      </div>

      {/* Stats summary */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <GlassCard hoverable>
              <Statistic title="企业总数" value={stats.totalEnterprises || 0} />
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard hoverable>
              <Statistic title="活跃企业" value={stats.activeEnterprises || 0} valueStyle={{ color: '#52c41a' }} />
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard hoverable>
              <Statistic title="用户总数" value={stats.totalUsers || 0} />
            </GlassCard>
          </Col>
          <Col span={6}>
            <GlassCard hoverable>
              <Statistic title="兑换总数" value={stats.totalExchanges || 0} />
            </GlassCard>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="搜索企业名称"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          onChange={(e) => { if (!e.target.value) { setKeyword(''); setPage(1); } }}
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
      </Space>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); if (ps) { /* pageSize changed */ } },
        }}
      />

      {/* Create Enterprise Modal */}
      <Modal
        title="开通企业"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const allPackages = (packagesData?.data?.records || packagesData?.data || []);
            const selectedPkg = allPackages.find((p: { id: string }) => p.id === values.packageId);
            createMutation.mutate({ ...values, packageName: selectedPkg?.name });
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
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="contactEmail" label="联系邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱' }]}>
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item name="packageId" label="选择套餐">
            <Select placeholder="请选择套餐" allowClear options={packageOptions} />
          </Form.Item>
          <Form.Item name="createSuperAdmin" label="同步创建超级管理员" valuePropName="checked">
            <Select
              placeholder="是否同步创建超管"
              options={[
                { value: true, label: '是，同步创建超管' },
                { value: false, label: '否，稍后手动创建' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.createSuperAdmin !== curr.createSuperAdmin}
          >
            {({ getFieldValue }) =>
              getFieldValue('createSuperAdmin') === true && (
                <>
                  <Form.Item
                    name="superAdminUsername"
                    label="超管用户名"
                    rules={[{ required: true, message: '请输入超管用户名' }]}
                  >
                    <Input placeholder="请输入超管用户名" />
                  </Form.Item>
                  <Form.Item
                    name="superAdminPhone"
                    label="超管手机号"
                    rules={[
                      { required: true, message: '请输入超管手机号' },
                      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                    ]}
                  >
                    <Input placeholder="请输入超管手机号" maxLength={11} />
                  </Form.Item>
                  <Form.Item
                    name="superAdminPassword"
                    label="超管密码"
                    rules={[{ required: true, message: '请输入超管密码' }, { min: 6, message: '密码至少6位' }]}
                  >
                    <Input.Password placeholder="请输入超管密码" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                确认开通
              </Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Enterprise Detail Modal */}
      <Modal
        title={`企业详情 - ${editingEnterprise?.name}`}
        open={detailModalOpen}
        onCancel={handleCloseDetail}
        footer={null}
        width={680}
        destroyOnClose
      >
        {editingEnterprise && (
          <Tabs
            activeKey={detailActiveTab}
            onChange={setDetailActiveTab}
            items={[
              { key: 'info', label: '基本信息', children: renderDetailInfo() },
              { key: 'users', label: '用户管理', children: renderDetailUsers() },
              { key: 'products', label: '已启用产品', children: renderDetailProducts() },
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
          icon={<ExclamationCircleOutlined />}
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