import React, { useState, useMemo } from 'react';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/BrandingProvider';
import { getTenantProducts } from '@/api/tenantProducts';
import TimeSlotTab from './rules/TimeSlotTab';
import ConsecutiveTab from './rules/ConsecutiveTab';
import LevelTab from './rules/LevelTab';
import SpecialTab from './rules/SpecialTab';
import DailyCapTab from './rules/DailyCapTab';
import StepCalcConfig from './walking/StepCalcConfig';
import FunEquivalenceConfig from './walking/FunEquivalenceConfig';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  featureGate?: string; // if set, only show when this feature is enabled
}

interface ProductGroup {
  key: string;
  label: string;
  productCode: string;
  tabs: TabItem[];
}

const STAIR_TABS: TabItem[] = [
  { key: 'timeslot', label: '时间段规则', icon: <ClockCircleOutlined /> },
  { key: 'consecutive', label: '连续奖励', icon: <TrophyOutlined />, featureGate: 'consecutive_reward' },
  { key: 'level', label: '等级系数', icon: <StarOutlined /> },
  { key: 'special', label: '特殊日期', icon: <CalendarOutlined />, featureGate: 'special_date' },
  { key: 'dailycap', label: '每日上限', icon: <ThunderboltOutlined /> },
];

const WALKING_TABS: TabItem[] = [
  { key: 'walking-step-calc', label: '步数换算', icon: <SwapOutlined /> },
  { key: 'walking-fun-equiv', label: '趣味等价物', icon: <SmileOutlined />, featureGate: 'fun_equivalence' },
];

const PRODUCT_GROUPS: ProductGroup[] = [
  { key: 'stair', label: '爬楼积分', productCode: 'stair_climbing', tabs: STAIR_TABS },
  { key: 'walking', label: '走路积分', productCode: 'walking', tabs: WALKING_TABS },
];

const Rules: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';
  const { primaryColor } = useBranding();
  const [activeProduct, setActiveProduct] = useState('stair');
  const [activeTab, setActiveTab] = useState('timeslot');

  const { data: tenantProducts } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
    retry: 1,
  });

  // Determine which products are available
  const availableProducts = useMemo(() => {
    if (!tenantProducts) return ['stair_climbing']; // default to stair climbing only
    return tenantProducts
      .filter((p: any) => p.productCode || p.category)
      .map((p: any) => p.productCode || p.category);
  }, [tenantProducts]);

  const enabledFeatures = useMemo(() => {
    // Extract enabled features from tenant products for feature gating
    const features: string[] = [];
    if (tenantProducts) {
      for (const p of tenantProducts) {
        if (p.featureConfig) {
          Object.entries(p.featureConfig).forEach(([key, value]) => {
            if (value === true || value === 'true' || value === '1') {
              features.push(key);
            }
          });
        }
      }
    }
    return features;
  }, [tenantProducts]);

  // Filter visible products and tabs
  const visibleGroups = PRODUCT_GROUPS.filter(
    (g) => availableProducts.includes(g.productCode)
  );

  // Auto-select first visible product if current is not available
  if (visibleGroups.length > 0 && !visibleGroups.find((g) => g.key === activeProduct)) {
    setActiveProduct(visibleGroups[0].key);
    setActiveTab(visibleGroups[0].tabs[0]?.key || 'timeslot');
  }

  const currentGroup = visibleGroups.find((g) => g.key === activeProduct);
  const visibleTabs = (currentGroup?.tabs || []).filter(
    (tab) => !tab.featureGate || enabledFeatures.includes(tab.featureGate)
  );

  // Auto-select first tab if current is hidden
  if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.key === activeTab)) {
    setActiveTab(visibleTabs[0].key);
  }

  const pillButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    borderRadius: 20,
    border: 'none',
    background: isActive
      ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
      : 'rgba(255,255,255,0.04)',
    color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    cursor: 'pointer',
    boxShadow: isActive
      ? `0 4px 12px ${primaryColor}40`
      : '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
  });

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
          按产品分组管理积分规则，仅显示套餐已启用的产品和功能点
        </p>
      </div>

      {/* Product Selector */}
      {visibleGroups.length > 1 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {visibleGroups.map((group) => (
            <button
              key={group.key}
              onClick={() => {
                setActiveProduct(group.key);
                setActiveTab(group.tabs[0]?.key || 'timeslot');
              }}
              style={{
                ...pillButtonStyle(activeProduct === group.key),
                padding: '10px 24px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: activeProduct === group.key ? 700 : 500,
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {/* Rule Tab Switcher */}
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
            onClick={() => setActiveTab(tab.key)}
            style={pillButtonStyle(activeTab === tab.key)}
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

      {/* Tab Content — Stair Climbing */}
      {activeProduct === 'stair' && (
        <div>
          {activeTab === 'timeslot' && <TimeSlotTab tenantId={tenantId} />}
          {activeTab === 'consecutive' && <ConsecutiveTab tenantId={tenantId} />}
          {activeTab === 'level' && <LevelTab tenantId={tenantId} />}
          {activeTab === 'special' && <SpecialTab tenantId={tenantId} />}
          {activeTab === 'dailycap' && <DailyCapTab tenantId={tenantId} />}
        </div>
      )}

      {/* Tab Content — Walking */}
      {activeProduct === 'walking' && (
        <div>
          {activeTab === 'walking-step-calc' && <StepCalcConfig />}
          {activeTab === 'walking-fun-equiv' && <FunEquivalenceConfig />}
        </div>
      )}
    </div>
  );
};

export default Rules;
