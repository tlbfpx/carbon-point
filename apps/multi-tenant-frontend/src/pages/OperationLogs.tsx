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
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getOperationLogs, OperationLog } from '@/api/platform';

const { RangePicker } = DatePicker;

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
      if (searchParams.operatorId) params.operatorId = searchParams.operatorId;
      if (searchParams.actionType) params.actionType = searchParams.actionType;
      if (searchParams.startDate) params.startDate = searchParams.startDate;
      if (searchParams.endDate) params.endDate = searchParams.endDate;
      return getOperationLogs(params);
    },
  });

  const openDetail = (record: OperationLog) => {
    setSelectedLog(record);
    setDetailModalOpen(true);
  };

  const columns = [
    { title: '操作人', dataIndex: 'operatorName', width: 120 },
    { title: '操作类型', dataIndex: 'actionType', width: 150, render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: '操作描述', dataIndex: 'description', ellipsis: true },
    { title: 'IP地址', dataIndex: 'ipAddress', width: 140 },
    { title: '执行时间', dataIndex: 'executionTime', width: 100, render: (t: number) => t ? `${t}ms` : '-' },
    { title: '操作时间', dataIndex: 'createTime', width: 180, render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss') },
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
              <Select.Option value="create">创建</Select.Option>
              <Select.Option value="update">更新</Select.Option>
              <Select.Option value="delete">删除</Select.Option>
              <Select.Option value="login">登录</Select.Option>
              <Select.Option value="logout">登出</Select.Option>
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
              <Button onClick={() => { form.resetFields(); setPage(1); setSearchParams({}); }}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

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
            <Descriptions.Item label="操作人">{selectedLog.adminName}</Descriptions.Item>
            <Descriptions.Item label="操作类型">{selectedLog.operationType || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作对象">{selectedLog.operationObject || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求方法">{selectedLog.requestMethod || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求URL">{selectedLog.requestUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求参数">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {selectedLog.requestParams || '-'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="响应结果">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {selectedLog.responseResult || '-'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="User Agent">{selectedLog.userAgent || '-'}</Descriptions.Item>
            <Descriptions.Item label="执行时间">{selectedLog.executionTime ? `${selectedLog.executionTime}ms` : '-'}</Descriptions.Item>
            <Descriptions.Item label="操作时间">{dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default OperationLogs;
