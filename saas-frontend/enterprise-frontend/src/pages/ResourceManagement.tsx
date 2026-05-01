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
} from 'antd';
import { SearchOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import {
  getPlatformResources,
  PlatformResource,
  RESOURCE_TYPES,
  ResourceType,
} from '../api/unifiedResources';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Experimental Resource Management page (Phase 2)
 * Hidden behind unified-resources feature flag
 */
const ResourceManagement: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | 'ALL'>('ALL');

  const { data: resources, isLoading, error } = useQuery({
    queryKey: ['platformResources'],
    queryFn: () => getPlatformResources(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter resources
  const filteredResources = resources?.filter((resource) => {
    const matchesType = filterType === 'ALL' || resource.type === filterType;
    const matchesSearch =
      !searchText ||
      resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
      resource.code.toLowerCase().includes(searchText.toLowerCase()) ||
      (resource.description?.toLowerCase() || '').includes(
        searchText.toLowerCase()
      );
    return matchesType && matchesSearch;
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

  // Table columns
  const columns = [
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PlatformResource) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <div>
            <Text strong>{name}</Text>
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
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>
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
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Experimental warning */}
      <Alert
        message="实验性功能"
        description="此页面为 Phase 2 实验性功能，目前为只读展示，后续版本将提供完整的资源配置能力。"
        type="info"
        showIcon
        icon={<ExperimentOutlined />}
        style={{ marginBottom: '24px' }}
      />

      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>统一资源管理</span>
          </Space>
        }
      >
        {/* Filters */}
        <Space style={{ marginBottom: '16px', width: '100%' }} wrap>
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
        </Space>

        {/* Table */}
        <Spin spinning={isLoading}>
          {error ? (
            <Alert
              message="加载失败"
              description={
                (error as Error)?.message || '无法加载资源列表，请稍后重试'
              }
              type="error"
              showIcon
            />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredResources}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              locale={{
                emptyText: <Empty description="暂无资源数据" />,
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default ResourceManagement;
