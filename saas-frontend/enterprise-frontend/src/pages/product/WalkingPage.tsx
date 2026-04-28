import React, { useMemo } from 'react';
import { Tabs, Empty } from 'antd';
import { useBranding } from '@/components/BrandingProvider';
import { useFeatureStore } from '@/store/featureStore';
import StepCalcConfig from '../walking/StepCalcConfig';
import FunEquivalenceConfig from '../walking/FunEquivalenceConfig';

const WalkingPage: React.FC = () => {
  const { primaryColor } = useBranding();
  const { isEnabled } = useFeatureStore();

  const tabItems = useMemo(() => {
    const tabs = [
      {
        key: 'overview',
        label: '数据概览',
        children: (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Empty description="走路积分数据统计即将上线" />
          </div>
        ),
      },
    ];

    if (isEnabled('walking.step_tier')) {
      tabs.push({ key: 'step-config', label: '步数换算', children: <StepCalcConfig /> });
    }
    if (isEnabled('walking.fun_conversion')) {
      tabs.push({ key: 'fun-equiv', label: '趣味等价物', children: <FunEquivalenceConfig /> });
    }

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
          走路积分管理
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          管理走路步数积分规则与数据
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

export default WalkingPage;
