import React, { useState } from 'react';
import {
  Table,
  Space,
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Tag,
  Descriptions,
  Modal,
  message,
  Tooltip,
} from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getOperationLogs, OperationLog } from '@/api/platform';

const { RangePicker } = DatePicker;

const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  CREATE: { label: '创建', color: 'green' },
  UPDATE: { label: '更新', color: 'blue' },
  DELETE: { label: '删除', color: 'red' },
  LOGIN: { label: '登录', color: 'cyan' },
  LOGOUT: { label: '登出', color: 'default' },
  EXPORT: { label: '导出', color: 'purple' },
  IMPORT: { label: '导入', color: 'orange' },
};

const OperationLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState<{
    operatorId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [form] = Form.useForm();

  const handleSearch = (values: any) => {
    setPage(1);
    setSearchParams({
      operatorId: values.operatorId,
      actionType: values.actionType,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    });
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['operation-logs', page, pageSize, searchParams],
    queryFn: () => {
      const params: any = { page, size: pageSize };
      if (searchParams.operatorId) params.adminId = searchParams.operatorId;
      if (searchParams.actionType) params.operationType = searchParams.actionType;
      if (searchParams.startDate) params.startDate = searchParams.startDate;
      if (searchParams.endDate) params.endDate = searchParams.endDate;
      return getOperationLogs(params);
    },
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const openDetail = (record: OperationLog) => {
    setSelectedLog(record);
    setDetailModalOpen(true);
  };

  const handleExport = () => {
    message.info('导出功能开发中');
  };

  const columns = [
    { title: '操作人', dataIndex: 'adminName', width: 120, render: (name: string) => name || '-' },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      width: 100,
      render: (type: string) => {
        const config = ACTION_TYPE_MAP[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    { title: '操作对象', dataIndex: 'operationObject', width: 140, ellipsis: true },
    { title: '请求方法', dataIndex: 'requestMethod', width: 80, render: (m: string) => m ? <Tag>{m}</Tag> : '-' },
    { title: '请求URL', dataIndex: 'requestUrl', ellipsis: true, render: (url: string) => url ? <Tooltip title={url}>{url}</Tooltip> : '-' },
    { title: 'IP地址', dataIndex: 'ipAddress', width: 140 },
    { title: '执行时间', dataIndex: 'executionTime', width: 90, render: (t: number) => t ? `${t}ms` : '-' },
    { title: '操作时间', dataIndex: 'createdAt', width: 170, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, record: OperationLog) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  const records = data?.data?.records || data?.data || [];
  const total = data?.data?.total || records.length;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>操作日志</h2>

      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          initialValues={{ dateRange: [dayjs().subtract(7, 'day'), dayjs()] }}
        >
          <Form.Item name="operatorId" label="操作人">
            <Input placeholder="操作人ID" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="actionType" label="操作类型">
            <Select placeholder="操作类型" style={{ width: 150 }} allowClear>
              {Object.entries(ACTION_TYPE_MAP).map(([value, { label }]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="时间范围">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setPage(1);
                  setSearchParams({});
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#666' }}>共 {total} 条记录</span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
        }}
      />

      <Modal
        title="操作日志详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[<Button key="close" onClick={() => setDetailModalOpen(false)}>关闭</Button>]}
        width={800}
      >
        {selectedLog && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="操作人">{selectedLog.adminName || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作类型">
              {selectedLog.operationType ? (
                <Tag color={ACTION_TYPE_MAP[selectedLog.operationType]?.color || 'default'}>
                  {ACTION_TYPE_MAP[selectedLog.operationType]?.label || selectedLog.operationType}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作对象">{selectedLog.operationObject || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求方法">{selectedLog.requestMethod || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求URL">{selectedLog.requestUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求参数">
              {selectedLog.requestParams ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.requestParams), null, 2);
                    } catch {
                      return selectedLog.requestParams;
                    }
                  })()}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="响应结果">
              {selectedLog.responseResult ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.responseResult), null, 2);
                    } catch {
                      return selectedLog.responseResult;
                    }
                  })()}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="User Agent">{selectedLog.userAgent || '-'}</Descriptions.Item>
            <Descriptions.Item label="执行时间">{selectedLog.executionTime ? `${selectedLog.executionTime}ms` : '-'}</Descriptions.Item>
            <Descriptions.Item label="操作时间">{selectedLog.createdAt ? dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default OperationLogs;