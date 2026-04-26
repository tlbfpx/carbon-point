import React, { useState, useMemo } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import FeatureGuard from '@/components/FeatureGuard';
import StepCalcConfig from './StepCalcConfig';
import FunEquivalenceConfig from './FunEquivalenceConfig';
import { SettingOutlined, SmileOutlined } from '@ant-design/icons';

const WalkingManagement: React.FC = () => {
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<string>('step-config');

  // Define all possible tabs; FeatureGuard will hide tabs whose feature is off.
  const allTabs = useMemo(
    () => [
      {
        key: 'step-config',
        label: '步数积分配置',
        icon: <SettingOutlined />,
        feature: 'walking.step_tier',
      },
      {
        key: 'fun-equiv',
        label: '趣味换算',
        icon: <SmileOutlined />,
        feature: 'walking.fun_conversion',
      },
    ],
    [],
  );

  // Filter tabs that should be visible — we render all and let FeatureGuard
  // return null for disabled features. However, for the tab bar itself we
  // need to know which are visible, so we always show them but wrap the
  // content in FeatureGuard.
  const visibleTabs = allTabs;

  // If active tab's content is hidden by FeatureGuard, fall back to step-config
  const handleTabClick = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div style={{ padding: '0 0 24px', fontFamily: 'var(--font-body, "Noto Sans SC", sans-serif)' }}>
      {/* Page Header */}
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
          走路管理
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          配置走路步数积分规则与趣味换算
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
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 20,
              border: 'none',
              background:
                activeTab === tab.key
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

      {/* Tab Content wrapped with FeatureGuard */}
      <div>
        <FeatureGuard feature="walking.step_tier">
          {activeTab === 'step-config' && <StepCalcConfig />}
        </FeatureGuard>
        <FeatureGuard feature="walking.fun_conversion">
          {activeTab === 'fun-equiv' && <FunEquivalenceConfig />}
        </FeatureGuard>
      </div>
    </div>
  );
};

export default WalkingManagement;
