import React, { useState } from 'react';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';
import TimeSlotTab from './rules/TimeSlotTab';
import ConsecutiveTab from './rules/ConsecutiveTab';
import LevelTab from './rules/LevelTab';
import SpecialTab from './rules/SpecialTab';
import DailyCapTab from './rules/DailyCapTab';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: 'timeslot', label: '时间段规则', icon: <ClockCircleOutlined /> },
  { key: 'consecutive', label: '连续奖励', icon: <TrophyOutlined /> },
  { key: 'level', label: '等级系数', icon: <StarOutlined /> },
  { key: 'special', label: '特殊日期', icon: <CalendarOutlined /> },
  { key: 'dailycap', label: '每日上限', icon: <ThunderboltOutlined /> },
];

const Rules: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState('timeslot');

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: '#fff',
          }}
        >
          规则配置
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'var(--font-body)' }}>
          自定义打卡积分规则、连续奖励和特殊日期倍率
        </p>
      </div>

      {/* Custom Pill-Style Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 20,
              border: 'none',
              background: activeTab === tab.key
                ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.65)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 500,
              cursor: 'pointer',
              boxShadow: activeTab === tab.key
                ? `0 4px 12px ${primaryColor}40`
                : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'timeslot' && <TimeSlotTab tenantId={tenantId} />}
        {activeTab === 'consecutive' && <ConsecutiveTab tenantId={tenantId} />}
        {activeTab === 'level' && <LevelTab tenantId={tenantId} />}
        {activeTab === 'special' && <SpecialTab tenantId={tenantId} />}
        {activeTab === 'dailycap' && <DailyCapTab tenantId={tenantId} />}
      </div>
    </div>
  );
};

export default Rules;
