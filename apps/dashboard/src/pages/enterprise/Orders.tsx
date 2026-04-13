import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  DatePicker,
  Select,
  Modal,
  message,
  Popconfirm,
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getOrders, verifyOrder, cancelOrder, Order } from '@/api/orders';

const { RangePicker } = DatePicker;

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  fulfilled: { text: '已发放', color: 'green' },
  used: { text: '已使用', color: 'blue' },
  expired: { text: '已过期', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
};

const Orders: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<Dayjs[]>([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const params = {
    page,
    size: 10,
    keyword: keyword || undefined,
    status: status || undefined,
    startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
    endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => getOrders(params),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyOrder,
    onSuccess: (res: { code: number; message?: string; data?: { couponCode?: string } }) => {
      if (res.code === 200) {
        message.success('核销成功');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        if (res.data?.couponCode) {
          setSelectedOrder(res.data as unknown as Order);
          setCouponModalOpen(true);
        }
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: (res: { code: number; message?: string }) => {
      if (res.code === 200) {
        message.success('订单已取消');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },
  });

  const columns = [
    { title: '用户', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    { title: '商品', dataIndex: 'productName' },
    {
      title: '商品类型',
      dataIndex: 'productType',
      render: (type: string) => <Tag>{type === 'coupon' ? '优惠券' : type === 'recharge' ? '直充' : '权益'}</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'pointsCost',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => {
        const label = statusLabels[status] || { text: status, color: 'default' };
        return <Tag color={label.color}>{label.text}</Tag>;
      },
    },
    { title: '下单时间', dataIndex: 'createTime', render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      render: (_: unknown, record: Order) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Popconfirm title="确认核销？" onConfirm={() => verifyMutation.mutate(record.id)}>
                <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                  核销
                </Button>
              </Popconfirm>
              <Popconfirm title="确认取消订单？" onConfirm={() => cancelMutation.mutate(record.id)}>
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'fulfilled' && record.couponCode && (
            <Button type="link" size="small" onClick={() => { setSelectedOrder(record); setCouponModalOpen(true); }}>
              查看券码
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>订单管理</h2>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索用户/商品"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 200 }}
        />
        <Select
          placeholder="筛选状态"
          allowClear
          style={{ width: 120 }}
          onChange={(val) => { setStatus(val || ''); setPage(1); }}
          options={Object.entries(statusLabels).map(([value, { text }]) => ({ value, label: text }))}
        />
        <RangePicker
          onChange={(dates) => { setDateRange(dates as Dayjs[]); setPage(1); }}
        />
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

      <Modal
        title="券码信息"
        open={couponModalOpen}
        onCancel={() => setCouponModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCouponModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedOrder && (
          <div>
            <p>商品：{selectedOrder.productName}</p>
            {selectedOrder.couponCode && (
              <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', textAlign: 'center' }}>
                <p style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>券码</p>
                <p style={{ fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4 }}>
                  {selectedOrder.couponCode}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
