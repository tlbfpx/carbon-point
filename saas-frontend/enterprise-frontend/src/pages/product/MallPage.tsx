import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import { useBranding } from '@/components/BrandingProvider';
import { useFeatureStore } from '@/store/featureStore';
import Products from '../Products';
import Orders from '../Orders';
import MallShelf from '../MallShelf';
import MallReports from '../MallReports';

const MallPage: React.FC = () => {
  const { primaryColor } = useBranding();
  const { isEnabled } = useFeatureStore();

  const tabItems = useMemo(() => {
    const tabs = [
      { key: 'overview', label: '数据概览', children: <MallReports hideHeader /> },
      { key: 'products', label: '商品管理', children: <Products hideHeader /> },
    ];

    if (isEnabled('mall.shelf')) {
      tabs.push({ key: 'shelf', label: '商品上架', children: <MallShelf hideHeader /> });
    }

    tabs.push({ key: 'orders', label: '订单管理', children: <Orders hideHeader /> });

    return tabs;
  }, [isEnabled]);

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 4,
            color: '#fff',
          }}
        >
          积分商城
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          管理商品、上架、订单和报表
        </p>
      </div>

      <Tabs
        items={tabItems}
        style={{ color: '#fff' }}
        tabBarStyle={{ marginBottom: 24 }}
      />
    </div>
  );
};

export default MallPage;
