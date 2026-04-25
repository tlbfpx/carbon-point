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
  Collapse,
} from 'antd';
import { GlassCard } from '@carbon-point/design-system';
import {
  PlusOutlined,
  EditOutlined,
  CrownOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getEnterprises,
  createEnterprise,
  deleteEnterprise,
  getPackages,
  updateTenantPackage,
  getEnterpriseUsers,
  assignSuperAdmin,
  getPlatformStats,
  getTenantProducts,
  getPackageDetail,
  Enterprise,
  EnterpriseUser,
  TenantProductInfo,
  PackageProduct,
  PackageProductFeature,
} from '@/api/platform';
import { platformApiClient } from '@/api/request';
import { FEATURE_MENU_MAP } from '@/constants/feature-menu-map';
import { extractArray } from '@/utils';

const { Text } = Typography;

// 企业状态管理API函数
const suspendEnterprise = async (id: string) => {
  const res = await platformApiClient.put(`/tenants/${id}/suspend`);
  return res.data;
};

const activateEnterprise = async (id: string) => {
  const res = await platformApiClient.put(`/tenants/${id}/activate`);
  return res.data;
};

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
    enabled: !!editingEnterprise?.id && detailModalOpen && (detailActiveTab === 'products' || detailActiveTab === 'permissions'),
    retry: false,
  });

  const { data: packageDetailData, isLoading: packageDetailLoading } = useQuery({
    queryKey: ['package-detail-for-permission', editingEnterprise?.packageId],
    queryFn: () => getPackageDetail(editingEnterprise!.packageId!),
    enabled: !!editingEnterprise?.packageId && detailModalOpen && detailActiveTab === 'permissions',
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createEnterprise,
    onSuccess: () => {
      message.success('企业创建成功');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => suspendEnterprise(id),
    onSuccess: () => {
      message.success('企业已停用');
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '停用失败');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateEnterprise(id),
    onSuccess: () => {
      message.success('企业已开通');
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '开通失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEnterprise(id),
    onSuccess: () => {
      message.success('企业已删除');
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err: unknown) => {
      const error = err as { message?: string; response?: { data?: { message?: string } } };
      message.error(error?.message || error?.response?.data?.message || '删除失败');
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ tenantId, packageId }: { tenantId: string; packageId: string }) =>
      updateTenantPackage(tenantId, packageId),
    onSuccess: () => {
      message.success('套餐更换成功');
      setPackageChangeConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '套餐更换失败');
    },
  });

  const assignSuperAdminMutation = useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      assignSuperAdmin(tenantId, userId),
    onSuccess: () => {
      message.success('超级管理员分配成功');
      queryClient.invalidateQueries({ queryKey: ['enterprise-users', editingEnterprise?.id] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message || '分配失败');
    },
  });

  const openDetail = (record: Enterprise) => {
    setEditingEnterprise(record);
    setSelectedPackageId(record.packageId != null ? String(record.packageId) : undefined);
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

  const stats = statsData;
  const packageOptions = (packagesData?.records || packagesData || [])
    .filter((p: { status: number | boolean }) => p.status === 1 || p.status === true)
    .map((p: { id: string | number; name: string }) => ({ value: String(p.id), label: p.name }));

  const allPackages = (packagesData?.records || packagesData || []) as { id: string | number; name: string; status: number | boolean }[];

  const columns = [
    {
      title: '企业名称',
      dataIndex: 'name',
      render: (name: string, record: Enterprise) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.expireTime && (
            <div style={{ fontSize: 12, color: dayjs(record.expireTime).isBefore(dayjs()) ? '#EF4444' : '#94A3B8' }}>
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
      dataIndex: 'packageId',
      width: 120,
      render: (packageId: number | string) => {
        if (!packageId) return <Tag>未绑定</Tag>;
        const pkg = allPackages.find(p => String(p.id) === String(packageId));
        return <Tag color={pkg ? 'blue' : 'default'}>{pkg?.name || `套餐${packageId}`}</Tag>;
      },
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
      width: 200,
      render: (_: unknown, record: Enterprise) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '停用' : '开通'}该企业？`}
            icon={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            onConfirm={() =>
              record.status === 'active'
                ? suspendMutation.mutate(record.id)
                : activateMutation.mutate(record.id)
            }
          >
            <Button type="link" size="small">
              {record.status === 'active' ? '停用' : '开通'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认删除该企业？"
            description="删除后数据将无法恢复，请谨慎操作"
            icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
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
    const products = tenantProductsData || [];
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

  const renderPermissionOverview = () => {
    if (!editingEnterprise?.packageId) {
      return (
        <Empty
          description="该企业尚未绑定套餐，无法查看权限信息"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (packageDetailLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin tip="加载中..." />
        </div>
      );
    }

    const packageDetail = packageDetailData;
    const packageProducts = packageDetail?.products || [];

    // Calculate stats from package products directly
    let enabledFeatures = 0;
    let totalMenus = 0;

    packageProducts.forEach((pp: PackageProduct) => {
      const features = pp.features || [];
      features.forEach((f: PackageProductFeature) => {
        if (f.isEnabled) {
          enabledFeatures++;
          const menus = FEATURE_MENU_MAP[f.featureId];
          if (menus) totalMenus++;
        }
      });
    });

    // Chain visualization items
    const chainItems = [
      {
        label: '套餐',
        value: packageDetail?.name || '—',
        color: '#ddf4ff',
        borderColor: '#0969da',
        textColor: '#0969da',
      },
      {
        label: '包含产品',
        value: `${packageProducts.length} 个`,
        color: '#dafbe1',
        borderColor: '#1a7f37',
        textColor: '#1a7f37',
      },
      {
        label: '启用功能点',
        value: `${enabledFeatures} 个`,
        color: '#fff8c5',
        borderColor: '#bf8700',
        textColor: '#9a6700',
      },
      {
        label: '企业菜单',
        value: `${totalMenus} 个`,
        color: '#f1e8ff',
        borderColor: '#8250df',
        textColor: '#8250df',
      },
    ];

    // Build collapse panels from package products directly
    const collapseItems = packageProducts.map((pp: PackageProduct) => {
      const features = pp.features || [];
      const enabledCount = features.filter((f: PackageProductFeature) => f.isEnabled).length;

      return {
        key: pp.productId || pp.productCode,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{pp.productName}</span>
            <Tag color={CATEGORY_COLOR_MAP[pp.productCategory] || 'default'}>
              {CATEGORY_LABEL_MAP[pp.productCategory] || pp.productCategory}
            </Tag>
            <span style={{ fontSize: 12, color: '#475569' }}>
              {enabledCount}/{features.length} 已启用
            </span>
          </div>
        ),
        children: features.length === 0 ? (
          <Empty description="暂无功能点配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: 60 }}>类型</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>功能点</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: 60 }}>状态</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>对应企业菜单</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f: PackageProductFeature) => {
                const menus = FEATURE_MENU_MAP[f.featureId];
                return (
                  <tr key={f.featureId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <Tag style={{ fontSize: 11 }}>
                        {f.featureType === 'permission' ? '权限' : '配置'}
                      </Tag>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {f.featureName || f.featureId}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      {f.isEnabled ? (
                        <span style={{ color: '#1a7f37' }}>●</span>
                      ) : (
                        <span style={{ color: '#8b949e' }}>○</span>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {f.isEnabled && menus ? (
                        <span style={{ color: '#656d76' }}>{menus.join(' / ')}</span>
                      ) : (
                        <span style={{ color: '#8b949e', fontStyle: 'italic' }}>
                          {f.isEnabled ? '— 菜单映射未定义' : '— 未启用，无菜单'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ),
      };
    });

    return (
      <div>
        {/* Chain visualization */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          marginBottom: 24,
          padding: '16px 0',
        }}>
          {chainItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <div style={{
                background: item.color,
                border: `1px solid ${item.borderColor}`,
                borderRadius: index === 0 ? '8px 0 0 8px' : index === chainItems.length - 1 ? '0 8px 8px 0' : '0',
                padding: '12px 20px',
                textAlign: 'center',
                minWidth: 120,
              }}>
                <div style={{ fontSize: 11, color: '#656d76' }}>{item.label}</div>
                <div style={{ fontWeight: 'bold', color: item.textColor }}>{item.value}</div>
              </div>
              {index < chainItems.length - 1 && (
                <span style={{ color: '#d0d7de', fontSize: 20, margin: '0 4px' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Product permission detail panels */}
        {packageProducts.length === 0 ? (
          <Empty
            description="该套餐尚未配置产品"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Collapse items={collapseItems} defaultActiveKey={packageProducts.map((pp: PackageProduct) => pp.productId || pp.productCode)} />
        )}
      </div>
    );
  };

  const total = data?.total || 0;
  const records = data?.records || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1E293B' }}>企业管理</h2>
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
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const allPackages = (packagesData?.records || packagesData || []);
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
        destroyOnHidden
      >
        {editingEnterprise && (
          <Tabs
            activeKey={detailActiveTab}
            onChange={setDetailActiveTab}
            items={[
              { key: 'info', label: '基本信息', children: renderDetailInfo() },
              { key: 'users', label: '用户管理', children: renderDetailUsers() },
              { key: 'products', label: '已启用产品', children: renderDetailProducts() },
              {
                key: 'permissions',
                label: '权限总览',
                children: renderPermissionOverview(),
              },
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
          setSelectedPackageId(editingEnterprise?.packageId != null ? String(editingEnterprise.packageId) : undefined);
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
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            新套餐权限将自动同步到企业超管角色，超出范围的运营角色权限将被移除。
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default EnterpriseManagement;