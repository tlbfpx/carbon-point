import React, { useMemo } from 'react';
import { Tabs, Empty } from 'antd';
import { useBranding } from '@/components/BrandingProvider';
import { useAuthStore } from '@/store/authStore';
import { useFeatureStore } from '@/store/featureStore';
import TimeSlotTab from '../rules/TimeSlotTab';
import ConsecutiveTab from '../rules/ConsecutiveTab';
import LevelTab from '../rules/LevelTab';
import SpecialTab from '../rules/SpecialTab';
import DailyCapTab from '../rules/DailyCapTab';
import WorkdayFilterTab from '../rules/WorkdayFilterTab';

const StairClimbingPage: React.FC = () => {
  const { primaryColor } = useBranding();
  const { user } = useAuthStore();
  const { isEnabled } = useFeatureStore();
  const tenantId = user?.tenantId || '';

  const tabItems = useMemo(() => {
    const tabs = [
      {
        key: 'overview',
        label: '数据概览',
        children: (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Empty description="爬楼签到数据统计即将上线" />
          </div>
        ),
      },
    ];

    if (isEnabled('time_slot')) {
      tabs.push({ key: 'timeslot', label: '规则配置', children: <TimeSlotTab tenantId={tenantId} /> });
    }
    if (isEnabled('consecutive_reward')) {
      tabs.push({ key: 'consecutive', label: '连续奖励', children: <ConsecutiveTab tenantId={tenantId} /> });
    }
    if (isEnabled('special_date')) {
      tabs.push({ key: 'special', label: '特殊日期', children: <SpecialTab tenantId={tenantId} /> });
    }
    if (isEnabled('level_coefficient')) {
      tabs.push({ key: 'level', label: '等级系数', children: <LevelTab tenantId={tenantId} /> });
    }
    if (isEnabled('daily_cap')) {
      tabs.push({ key: 'dailycap', label: '每日上限', children: <DailyCapTab tenantId={tenantId} /> });
    }
    if (isEnabled('workday_filter')) {
      tabs.push({ key: 'workday', label: '工作日过滤', children: <WorkdayFilterTab tenantId={tenantId} /> });
    }

    return tabs;
  }, [isEnabled, tenantId]);

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
          爬楼积分管理
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          管理爬楼签到规则与数据
        </p>
      </div>

      <Tabs
        items={tabItems}
        style={{ color: '#fff' }}
        tabBarStyle={{
          marginBottom: 24,
        }}
      />
    </div>
  );
};

export default StairClimbingPage;
