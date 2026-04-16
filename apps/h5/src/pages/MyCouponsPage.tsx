import React, { useState } from 'react';
import { Card, Tabs, Badge, Button, Empty, TabBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyCoupons } from '@/api/mall';
import { useAuthStore } from '@/store/authStore';

interface Coupon {
  id: string;
  name: string;
  status: 'available' | 'used' | 'expired';
  expireTime: string;
}

const MyCouponsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('available');

  const { data: couponsData } = useQuery({
    queryKey: ['myCoupons', activeTab],
    queryFn: () => getMyCoupons(user?.userId || '', activeTab),
    enabled: !!user?.userId,
  });

  const coupons = (couponsData?.data || []) as Coupon[];
  const availableCount = coupons.filter((c) => c.status === 'available').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>我的卡券</h2>
          {availableCount > 0 && (
            <Badge content={availableCount} style={{ marginLeft: 8 }} />
          )}
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        style={{ background: '#fff' }}
      >
        <Tabs.Tab title="可用" key="available" />
        <Tabs.Tab title="已使用" key="used" />
        <Tabs.Tab title="已过期" key="expired" />
      </Tabs>

      <div style={{ padding: 16 }}>
        {coupons.length === 0 ? (
          <Empty description="暂无卡券" />
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon.id} style={{ marginBottom: 12 }}>
              <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: 16, margin: 0 }}>{coupon.name}</p>
                  <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    有效期至：{coupon.expireTime}
                  </p>
                </div>
                <Button size="small" disabled={coupon.status !== 'available'}>
                  {coupon.status === 'available' ? '使用' : coupon.status === 'used' ? '已使用' : '已过期'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <TabBar activeKey="coupons" onChange={(key) => {
        if (key === 'home') navigate('/');
        else if (key === 'checkin') navigate('/checkin');
        else if (key === 'mall') navigate('/mall');
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

export default MyCouponsPage;
