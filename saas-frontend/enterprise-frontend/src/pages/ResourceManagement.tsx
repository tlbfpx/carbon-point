import React, { useState } from 'react';
import {
  Table,
  Tag,
  Card,
  Input,
  Select,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  Button,
  Modal,
  Form,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Breadcrumb,
  Checkbox,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  ExperimentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HomeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  getPlatformResources,
  createPlatformResource,
  updatePlatformResource,
  deletePlatformResource,
  PlatformResource,
  RESOURCE_TYPES,
  ResourceType,
} from '../api/unifiedResources';
import { useFeatureStore } from '../store/featureStore';
import { logger, componentLogger } from '../utils';

const { Title, Text } = Typography;
const { Option } = Select;

type ModalMode = 'create' | 'edit' | null;

/**
 * Resource Management page (Phase 2)
 * Enhanced with better loading states, error handling, batch operations, and analytics
 */
const ResourceManagement: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingResource, setEditingResource] = useState<PlatformResource | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUseLegacyUI } = useFeatureStore();

  componentLogger.info('ResourceManagement page mounted');

  const { data: resources, isLoading, error, refetch } = useQuery({
    queryKey: ['platformResources'],
    queryFn: () => {
      logger.info('[ResourceManagement] Fetching platform resources');
      return getPlatformResources();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: createPlatformResource,
    onMutate: async (newResource) => {
      logger.info('[ResourceManagement] Creating new resource:', newResource.code);
      await queryClient.cancelQueries({ queryKey: ['platformResources'] });
      const previousResources = queryClient.getQueryData<PlatformResource[]>(['platformResources']);
      queryClient.setQueryData<PlatformResource[]>(['platformResources'], (old) => [
        ...(old || []),
        { ...newResource, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
      return { previousResources };
    },
    onError: (err, newResource, context) => {
      logger.error('[ResourceManagement] Create resource failed:', err);
      queryClient.setQueryData(['platformResources'], context?.previousResources);
      message.error('创建资源失败：' + (err as Error)?.message);
    },
    onSuccess: () => {
      logger.info('[ResourceManagement] Resource created successfully');
      message.success('资源创建成功');
      closeModal();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['platformResources'] });
    },
  });

  // Update mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlatformResource> }) =>
      updatePlatformResource(id, data),
    onMutate: async ({ id, data }) => {
      logger.info('[ResourceManagement] Updating resource:', id);
      await queryClient.cancelQueries({ queryKey: ['platformResources'] });
      const previousResources = queryClient.getQueryData<PlatformResource[]>(['platformResources']);
      queryClient.setQueryData<PlatformResource[]>(['platformResources'], (old) =>
        (old || []).map((resource) =>
          resource.id === id ? { ...resource, ...data, updatedAt: new Date().toISOString() } : resource
        )
      );
      return { previousResources };
    },
    onError: (err, { id }, context) => {
      logger.error('[ResourceManagement] Update resource failed:', err);
      queryClient.setQueryData(['platformResources'], context?.previousResources);
      message.error('更新资源失败：' + (err as Error)?.message);
    },
    onSuccess: () => {
      logger.info('[ResourceManagement] Resource updated successfully');
      message.success('资源更新成功');
      closeModal();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['platformResources'] });
    },
  });

  // Delete mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: deletePlatformResource,
    onMutate: async (id) => {
      logger.info('[ResourceManagement] Deleting resource:', id);
      await queryClient.cancelQueries({ queryKey: ['platformResources'] });
      const previousResources = queryClient.getQueryData<PlatformResource[]>(['platformResources']);
      queryClient.setQueryData<PlatformResource[]>(['platformResources'], (old) =>
        (old || []).filter((resource) => resource.id !== id)
      );
      return { previousResources };
    },
    onError: (err, id, context) => {
      logger.error('[ResourceManagement] Delete resource failed:', err);
      queryClient.setQueryData(['platformResources'], context?.previousResources);
      message.error('删除资源失败：' + (err as Error)?.message);
    },
    onSuccess: () => {
      logger.info('[ResourceManagement] Resource deleted successfully');
      message.success('资源删除成功');
      setSelectedRowKeys([]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['platformResources'] });
    },
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deletePlatformResource(id);
      }
    },
    onMutate: async (ids) => {
      logger.info('[ResourceManagement] Batch deleting resources:', ids);
      await queryClient.cancelQueries({ queryKey: ['platformResources'] });
      const previousResources = queryClient.getQueryData<PlatformResource[]>(['platformResources']);
      queryClient.setQueryData<PlatformResource[]>(['platformResources'], (old) =>
        (old || []).filter((resource) => !ids.includes(resource.id))
      );
      return { previousResources };
    },
    onError: (err, ids, context) => {
      logger.error('[ResourceManagement] Batch delete failed:', err);
      queryClient.setQueryData(['platformResources'], context?.previousResources);
      message.error('批量删除失败：' + (err as Error)?.message);
    },
    onSuccess: () => {
      logger.info('[ResourceManagement] Batch delete successful');
      message.success('批量删除成功');
      setSelectedRowKeys([]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['platformResources'] });
    },
  });

  // Filter resources
  const filteredResources = resources?.filter((resource) => {
    const matchesType = filterType === 'ALL' || resource.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || resource.status === filterStatus;
    const matchesSearch =
      !searchText ||
      resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.code.toLowerCase().includes(searchText.toLowerCase()) ||
      (resource.description?.toLowerCase() || '').includes(
        searchText.toLowerCase()
      );
    return matchesType && matchesStatus && matchesSearch;
  });

  // Get resource type color
  const getResourceTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      [RESOURCE_TYPES.FUNCTION_PRODUCT]: 'blue',
      [RESOURCE_TYPES.MALL_PRODUCT]: 'green',
      [RESOURCE_TYPES.FEATURE]: 'orange',
      [RESOURCE_TYPES.PERMISSION_GROUP]: 'purple',
    };
    return colorMap[type] || 'default';
  };

  // Get resource type label
  const getResourceTypeLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      [RESOURCE_TYPES.FUNCTION_PRODUCT]: '功能产品',
      [RESOURCE_TYPES.MALL_PRODUCT]: '商城商品',
      [RESOURCE_TYPES.FEATURE]: '功能点',
      [RESOURCE_TYPES.PERMISSION_GROUP]: '权限组',
    };
    return labelMap[type] || type;
  };

  const openCreateModal = () => {
    logger.info('[ResourceManagement] Opening create modal');
    setModalMode('create');
    setEditingResource(null);
    form.resetFields();
    form.setFieldsValue({ status: true, sortOrder: 0 });
  };

  const openEditModal = (record: PlatformResource) => {
    logger.info('[ResourceManagement] Opening edit modal for resource:', record.id);
    setModalMode('edit');
    setEditingResource(record);
    form.setFieldsValue({
      ...record,
      status: record.status === 'ACTIVE',
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingResource(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const processedValues = {
        ...values,
        status: values.status ? 'ACTIVE' : 'INACTIVE',
      };
      if (modalMode === 'create') {
        createMutation.mutate(processedValues);
      } else if (modalMode === 'edit' && editingResource) {
        updateMutation.mutate({ id: editingResource.id, data: processedValues });
      }
    } catch (err) {
      logger.warn('[ResourceManagement] Form validation failed:', err);
      // Validation failed, do nothing
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    batchDeleteMutation.mutate(selectedRowKeys as string[]);
  };

  const handleRefresh = () => {
    logger.info('[ResourceManagement] Refreshing resources list');
    refetch();
    message.info('正在刷新...');
  };

  const handleSwitchToLegacy = () => {
    logger.info('[ResourceManagement] User switching to legacy UI');
    setUseLegacyUI(true);
    message.success('已切换到旧版界面');
    navigate('/dashboard');
  };

  // Table columns
  const columns = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PlatformResource) => (
        <Space>
          {record.icon && <span style={{ fontSize: '18px' }}>{record.icon}</span>}
          <div>
            <Text strong style={{ fontSize: '14px' }}>{name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getResourceTypeColor(type)}>
          {getResourceTypeLabel(type)}
        </Tag>
      ),
      filters: [
        { text: '功能产品', value: RESOURCE_TYPES.FUNCTION_PRODUCT },
        { text: '商城商品', value: RESOURCE_TYPES.MALL_PRODUCT },
        { text: '功能点', value: RESOURCE_TYPES.FEATURE },
        { text: '权限组', value: RESOURCE_TYPES.PERMISSION_GROUP },
      ],
      onFilter: (value: any, record: PlatformResource) =>
        record.type === value,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'} icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {status === 'ACTIVE' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      sorter: (a: PlatformResource, b: PlatformResource) =>
        (a.sortOrder || 0) - (b.sortOrder || 0),
      render: (sortOrder: number) => sortOrder ?? 0,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: PlatformResource) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除该资源？"
            description="此操作不可恢复"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      logger.debug('[ResourceManagement] Selected rows changed:', newSelectedRowKeys);
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: 'calc(100vh - 56px)' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <HomeOutlined />
          <span style={{ marginLeft: '4px' }}>首页</span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <SettingOutlined />
          <span style={{ marginLeft: '4px' }}>系统设置</span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>统一资源管理</Breadcrumb.Item>
      </Breadcrumb>

      {/* Welcome Banner */}
      <Card
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '12px',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              <ExperimentOutlined style={{ marginRight: '12px' }} />
              统一资源管理
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: '8px', display: 'block' }}>
              管理平台资源、功能产品和商城商品
            </Text>
          </div>
          <Button
            onClick={handleSwitchToLegacy}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
            }}
          >
            使用旧版界面
          </Button>
        </div>
      </Card>

      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>资源列表</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              新建资源
            </Button>
          </Space>
        }
        style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        {/* Filters */}
        <Space style={{ marginBottom: '20px', width: '100%' }} wrap>
          <Input
            placeholder="搜索资源名称、编码或描述"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
            allowClear
          />
          <Select
            placeholder="选择资源类型"
            value={filterType}
            onChange={setFilterType}
            style={{ width: '150px' }}
          >
            <Option value="ALL">全部类型</Option>
            <Option value={RESOURCE_TYPES.FUNCTION_PRODUCT}>功能产品</Option>
            <Option value={RESOURCE_TYPES.MALL_PRODUCT}>商城商品</Option>
            <Option value={RESOURCE_TYPES.FEATURE}>功能点</Option>
            <Option value={RESOURCE_TYPES.PERMISSION_GROUP}>权限组</Option>
          </Select>
          <Select
            placeholder="选择状态"
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: '120px' }}
          >
            <Option value="ALL">全部状态</Option>
            <Option value="ACTIVE">启用</Option>
            <Option value="INACTIVE">停用</Option>
          </Select>
        </Space>

        {/* Batch Operations */}
        {selectedRowKeys.length > 0 && (
          <Alert
            message={`已选择 ${selectedRowKeys.length} 项`}
            type="info"
            showIcon
            action={
              <Space>
                <Popconfirm
                  title="确认批量删除？"
                  description={`将删除 ${selectedRowKeys.length} 个资源，此操作不可恢复`}
                  onConfirm={handleBatchDelete}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button danger size="small" icon={<DeleteOutlined />} loading={batchDeleteMutation.isPending}>
                    批量删除
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
              </Space>
            }
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Table */}
        <Spin
          spinning={isLoading}
          tip="正在加载资源列表..."
          size="large"
        >
          {error ? (
            <Alert
              message="加载失败"
              description={
                <div>
                  <p>{(error as Error)?.message || '无法加载资源列表'}</p>
                  <Button type="primary" onClick={handleRefresh} style={{ marginTop: '8px' }}>
                    重试
                  </Button>
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          ) : (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredResources}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条资源`,
              }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <div>
                        <p style={{ marginBottom: '8px' }}>暂无资源数据</p>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                          创建第一个资源
                        </Button>
                      </div>
                    }
                  />
                ),
              }}
            />
          )}
        </Spin>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === 'create' ? '新建资源' : '编辑资源'}
        open={modalMode !== null}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="确认"
        cancelText="取消"
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: true, sortOrder: 0 }}
        >
          <Form.Item
            name="name"
            label="资源名称"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="请输入资源名称" size="large" />
          </Form.Item>

          <Form.Item
            name="code"
            label="资源编码"
            rules={[
              { required: true, message: '请输入资源编码' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '编码只能包含字母、数字、下划线和中划线' },
            ]}
          >
            <Input placeholder="请输入资源编码（英文）" disabled={modalMode === 'edit'} size="large" />
          </Form.Item>

          <Form.Item
            name="type"
            label="资源类型"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="请选择资源类型" size="large">
              <Option value={RESOURCE_TYPES.FUNCTION_PRODUCT}>功能产品</Option>
              <Option value={RESOURCE_TYPES.MALL_PRODUCT}>商城商品</Option>
              <Option value={RESOURCE_TYPES.FEATURE}>功能点</Option>
              <Option value={RESOURCE_TYPES.PERMISSION_GROUP}>权限组</Option>
            </Select>
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Input placeholder="请输入分类，例如：健康、运动等" size="large" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入资源描述" showCount maxLength={500} />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Input placeholder="请输入图标（emoji 或 icon 名称，例如：🚀）" size="large" />
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item name="sortOrder" label="排序">
            <InputNumber style={{ width: '100%' }} placeholder="请输入排序值，数字越小越靠前" size="large" />
          </Form.Item>

          <Form.Item name="metadata" label="元数据">
            <Input.TextArea rows={2} placeholder="JSON 格式的元数据，可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceManagement;
