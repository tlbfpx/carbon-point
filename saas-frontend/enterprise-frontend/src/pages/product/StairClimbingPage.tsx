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

    if (isEnabled('stair.time_slot')) {
      tabs.push({ key: 'timeslot', label: '时段配置', children: <TimeSlotTab tenantId={tenantId} /> });
    }
    if (isEnabled('stair.floor_points')) {
      tabs.push({ key: 'floorpoints', label: '楼层积分', children: <div style={{ padding: 24 }}>楼层积分配置功能即将上线</div> });
    }
    if (isEnabled('stair.special_date')) {
      tabs.push({ key: 'special', label: '特殊日期', children: <SpecialTab tenantId={tenantId} /> });
    }
    if (isEnabled('stair.workday_only')) {
      tabs.push({ key: 'workday', label: '工作日限制', children: <WorkdayFilterTab tenantId={tenantId} /> });
    }
    if (isEnabled('stair.leaderboard')) {
      tabs.push({ key: 'leaderboard', label: '排行榜', children: <div style={{ padding: 24 }}>排行榜配置功能即将上线</div> });
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
            color: '#2c2825',
          }}
        >
          爬楼积分管理
        </h1>
        <p style={{ color: '#8a857f', fontSize: 14, margin: 0 }}>
          管理爬楼签到规则与数据
        </p>
      </div>

      <Tabs
        items={tabItems}
        tabBarStyle={{
          marginBottom: 24,
        }}
      />
    </div>
  );
};

export default StairClimbingPage;
