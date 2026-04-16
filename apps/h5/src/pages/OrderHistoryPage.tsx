import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Empty, DotLoading, TabBar, Tabs, Badge } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getMyOrders } from '@/api/mall';
import { useAuthStore } from '@/store/authStore';

type OrderStatus = 'pending' | 'fulfilled' | 'used' | 'expired' | 'cancelled';

const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  fulfilled: '已完成',
  used: '已使用',
  expired: '已过期',
  cancelled: '已取消',
};

const statusColors: Record<OrderStatus, string> = {
  pending: '#faad14',
  fulfilled: '#52c41a',
  used: '#999',
  expired: '#ff4d4f',
  cancelled: '#999',
};

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => getMyOrders(user?.userId || ''),
    enabled: !!user?.userId,
  });

  const allOrders = data?.data || [];
  const filteredOrders = activeTab === 'all'
    ? allOrders
    : allOrders.filter((o: { status: string }) => o.status === activeTab);

  const pendingCount = allOrders.filter((o: { status: string }) => o.status === 'pending').length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>兑换订单</h2>
          {pendingCount > 0 && (
            <Badge content={pendingCount} style={{ marginLeft: 8 }} />
          )}
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as OrderStatus | 'all')}
        style={{ background: '#fff' }}
      >
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="待处理" key="pending" />
        <Tabs.Tab title="已完成" key="fulfilled" />
        <Tabs.Tab title="已使用" key="used" />
        <Tabs.Tab title="已过期" key="expired" />
      </Tabs>

      <div style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <DotLoading />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Empty description="暂无订单" />
        ) : (
          filteredOrders.map((order: {
            id: string;
            productName: string;
            pointsCost: number;
            status: OrderStatus;
            createTime: string;
          }) => (
            <Card key={order.id} style={{ marginBottom: 12 }}>
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{order.productName}</p>
                    <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                      {formatDate(order.createTime)}
                    </p>
                  </div>
                  <span
                    style={{
                      background: statusColors[order.status],
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                    -{order.pointsCost} 积分
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <TabBar activeKey="mall" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'coupons') navigate('/my-coupons');
        else if (key === 'profile') navigate('/profile');
      }}>
        <TabBar.Item key="home" title="首页" />
        <TabBar.Item key="checkin" title="打卡" />
        <TabBar.Item key="mall" title="商城" />
        <TabBar.Item key="coupons" title="卡券" />
        <TabBar.Item key="profile" title="我的" />
      </TabBar>
    </div>
  );
};

export default OrderHistoryPage;
