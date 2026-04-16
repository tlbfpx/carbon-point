import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SearchBar, TabBar, List, Button, Badge } from 'antd-mobile';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/api/mall';
import { useAuthStore } from '@/store/authStore';

interface Product {
  id: string;
  name: string;
  description: string;
  pointsPrice: number;
  stock: number | null;
}

const MallPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const tabs = ['全部', '优惠券', '直充', '权益'];

  const { data: productsData } = useQuery({
    queryKey: ['products', activeTab],
    queryFn: () => getProducts(user?.tenantId || '', tabs[activeTab] === '全部' ? undefined : tabs[activeTab]),
    enabled: !!user?.tenantId,
  });

  const products = (productsData?.data?.records || []) as Product[];

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '8px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SearchBar placeholder="搜索商品" value={searchQuery} onChange={(val) => setSearchQuery(val)} style={{ flex: 1 }} />
          <span
            style={{ color: '#1677ff', fontSize: 14, marginLeft: 8, whiteSpace: 'nowrap', cursor: 'pointer' }}
            onClick={() => navigate('/orders')}
          >
            我的订单
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <List>
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              style={{ marginBottom: 12 }}
              onClick={() => navigate(`/mall/${product.id}`)}
            >
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{product.name}</p>
                    <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>{product.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 'bold' }}>
                        {product.pointsPrice} 积分
                      </span>
                      {product.stock === 0 && (
                        <Badge content="售罄" style={{ marginLeft: 8, background: '#999' }} />
                      )}
                    </div>
                  </div>
                  <Button size="small" disabled={product.stock === 0}>
                    兑换
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </List>
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

export default MallPage;
