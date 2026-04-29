import React, { useState, useMemo } from 'react';
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
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getOrders, verifyOrder, cancelOrder, Order } from '@/api/orders';
import { useBranding } from '@/components/BrandingProvider';
import { GlassCard } from '@carbon-point/design-system';

const { RangePicker } = DatePicker;

const statusLabels: Record<string, { text: string; bg: string; color: string }> = {
  pending: { text: '待处理', bg: 'rgba(245,124,0,0.15)', color: '#f57c00' },
  fulfilled: { text: '已发放', bg: 'rgba(56,142,60,0.15)', color: '#388e3c' },
  used: { text: '已使用', bg: 'rgba(25,118,210,0.15)', color: '#1976d2' },
  expired: { text: '已过期', bg: 'rgba(0,0,0,0.04)', color: '#8a857f' },
  cancelled: { text: '已取消', bg: 'rgba(211,47,47,0.15)', color: '#d32f2f' },
};

const productTypeLabels: Record<string, { text: string; bg: string; color: string }> = {
  coupon: { text: '优惠券', bg: 'rgba(25,118,210,0.15)', color: '#1976d2' },
  recharge: { text: '直充', bg: 'rgba(56,142,60,0.15)', color: '#388e3c' },
  privilege: { text: '权益', bg: 'rgba(245,124,0,0.15)', color: '#f57c00' },
};

const Orders: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { primaryColor } = useBranding();
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

  const columns = useMemo(() => [
    {
      title: '用户',
      dataIndex: 'username',
      render: (username: string) => (
        <span
          style={{
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            fontWeight: 500,
          }}
        >
          {username}
        </span>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      render: (phone: string) => (
        <span style={{ fontFamily: 'Outfit, sans-serif', color: '#8a857f' }}>
          {phone}
        </span>
      ),
    },
    {
      title: '商品',
      dataIndex: 'productName',
      render: (name: string) => (
        <span
          style={{
            fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
            fontWeight: 500,
          }}
        >
          {name}
        </span>
      ),
    },
    {
      title: '商品类型',
      dataIndex: 'productType',
      render: (type: string) => {
        const style = productTypeLabels[type] || { text: type, bg: '#f5f5f5', color: '#666' };
        return (
          <Tag
            style={{
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              fontSize: 13,
              border: 'none',
              background: style.bg,
              color: style.color,
            }}
          >
            {style.text}
          </Tag>
        );
      },
    },
    {
      title: '积分',
      dataIndex: 'pointsCost',
      render: (v: number) => (
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: primaryColor,
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => {
        const style = statusLabels[status] || { text: status, bg: '#f5f5f5', color: '#666' };
        return (
          <Tag
            style={{
              borderRadius: 20,
              padding: '4px 12px',
              fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              fontSize: 13,
              border: 'none',
              background: style.bg,
              color: style.color,
            }}
          >
            {style.text}
          </Tag>
        );
      },
    },
    {
      title: '下单时间',
      dataIndex: 'createTime',
      render: (t: string) => (
        <span style={{ fontFamily: 'Outfit, sans-serif', color: '#8a857f', fontSize: 13 }}>
          {dayjs(t).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: Order) => (
        <Space size={8}>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="确认核销此订单？"
                onConfirm={() => verifyMutation.mutate(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  style={{
                    borderRadius: 20,
                    border: '1px solid rgba(56,142,60,0.4)',
                    color: '#388e3c',
                    fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                  }}
                >
                  核销
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认取消此订单？"
                onConfirm={() => cancelMutation.mutate(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  size="small"
                  icon={<CloseCircleOutlined />}
                  style={{
                    borderRadius: 20,
                    border: '1px solid rgba(211,47,47,0.4)',
                    color: '#d32f2f',
                    fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                  }}
                >
                  取消
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'fulfilled' && record.couponCode && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { setSelectedOrder(record); setCouponModalOpen(true); }}
              style={{
                borderRadius: 20,
                border: '1px solid #d4d0c8',
                color: primaryColor,
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            >
              查看券码
            </Button>
          )}
        </Space>
      ),
    },
  ], [primaryColor, verifyMutation, cancelMutation]);

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      {/* Page Header */}
      {!hideHeader && (
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: '#2c2825',
          }}
        >
          订单管理
        </h1>
        <p style={{ color: '#8a857f', fontSize: 14, margin: 0 }}>查看和管理所有兑换订单</p>
      </div>
      )}

      {/* Filter Bar */}
      <GlassCard hoverable style={{ marginBottom: 20, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="搜索用户/商品"
          allowClear
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          style={{ width: 220 }}
          styles={{
            input: {
              borderRadius: 12,
              border: '1px solid #d4d0c8',
            },
          }}
        />
        <Select
          placeholder="筛选状态"
          allowClear
          style={{ width: 140 }}
          onChange={(val) => { setStatus(val || ''); setPage(1); }}
          options={Object.entries(statusLabels).map(([value, { text }]) => ({ value, label: text }))}
          variant="outlined"
        />
        <RangePicker
          onChange={(dates) => { setDateRange(dates as Dayjs[]); setPage(1); }}
          placeholder={['开始日期', '结束日期']}
          style={{
            borderRadius: 12,
            border: '1px solid #d4d0c8',
          }}
          popupClassName="digital-garden-calendar"
        />
      </GlassCard>

      {/* Table Card */}
      <GlassCard hoverable style={{ overflow: 'hidden' }}>
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
            showSizeChanger: false,
            itemRender: (current, type, originalElement) => {
              if (type === 'page') {
                return (
                  <Button
                    style={{
                      borderRadius: 8,
                      border: '1px solid #d4d0c8',
                      color: current === page ? primaryColor : '#8a857f',
                      background: current === page ? `${primaryColor}15` : '#faf8f5',
                      fontWeight: current === page ? 600 : 400,
                    }}
                  >
                    {current}
                  </Button>
                );
              }
              return originalElement;
            },
          }}
          className="digital-garden-table"
          rowClassName={(record, index) => (index % 2 === 0 ? '' : 'odd-row')}
        />
      </GlassCard>

      {/* Coupon Code Modal */}
      <Modal
        title={null}
        open={couponModalOpen}
        onCancel={() => setCouponModalOpen(false)}
        footer={null}
        width={400}
        closeIcon={null}
        styles={{
          content: {
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #d4d0c8',
          }}
        >
          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              color: '#2c2825',
            }}
          >
            券码信息
          </h2>
        </div>
        <div style={{ padding: '24px' }}>
          {selectedOrder && (
            <div>
              <p
                style={{
                  color: '#8a857f',
                  marginBottom: 16,
                  fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                }}
              >
                商品：{selectedOrder.productName}
              </p>
              {selectedOrder.couponCode && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '20px',
                    background: 'linear-gradient(135deg, #f8f7f4 0%, #f0efea 100%)',
                    borderRadius: 16,
                    textAlign: 'center',
                    border: '1px dashed #d4d0c8',
                  }}
                >
                  <p
                    style={{
                      color: '#8a857f',
                      fontSize: 12,
                      marginBottom: 8,
                      fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
                    }}
                  >
                    券码
                  </p>
                  <p
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      fontFamily: 'Outfit, monospace',
                      letterSpacing: 4,
                      color: '#2c2825',
                      margin: 0,
                    }}
                  >
                    {selectedOrder.couponCode}
                  </p>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button
              onClick={() => setCouponModalOpen(false)}
              style={{
                borderRadius: 20,
                border: '1px solid #d4d0c8',
                color: '#8a857f',
                fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)',
              }}
            >
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .digital-garden-table .ant-table-thead > tr > th {
          background: #faf8f5 !important;
          border-bottom: 1px solid #d4d0c8 !important;
          font-family: 'Outfit', sans-serif !important;
          font-weight: 600 !important;
          color: #8a857f !important;
          padding: 16px !important;
        }
        .digital-garden-table .ant-table-tbody > tr > td {
          padding: 16px !important;
          border-bottom: 1px solid #d4d0c8 !important;
          color: #2c2825 !important;
          background: #fff !important;
        }
        .digital-garden-table .ant-table-tbody > tr:hover > td {
          background: #faf8f5 !important;
        }
        .digital-garden-table .ant-table-tbody > tr > td:first-child {
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }
        .digital-garden-table .ant-table-tbody > tr > td:last-child {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .digital-garden-table .ant-table-tbody > tr.odd-row > td {
          background: #faf8f5 !important;
        }
        .digital-garden-table .ant-pagination-item {
          border-radius: 8px !important;
          border: 1px solid #d4d0c8 !important;
        }
        .digital-garden-table .ant-pagination-item-active {
          background: ${primaryColor}15 !important;
          border-color: ${primaryColor} !important;
        }
        .digital-garden-table .ant-pagination-item-active a {
          color: ${primaryColor} !important;
        }
        .digital-garden-calendar .ant-picker-panel-container {
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default Orders;
