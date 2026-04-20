import React, { useState, useMemo } from 'react';
import { useBranding } from '@/components/BrandingProvider';
import StepCalcConfig from './StepCalcConfig';
import FunEquivalenceConfig from './FunEquivalenceConfig';
import { SettingOutlined, SmileOutlined } from '@ant-design/icons';
import { getTenantProducts } from '@/api/tenantProducts';
import { useQuery } from '@tanstack/react-query';

const WalkingManagement: React.FC = () => {
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState<'step-config' | 'fun-equiv'>('step-config');

  // Fetch tenant products to check enabled features
  const { data: tenantProducts } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
  });

  // Check if fun_equivalence feature is enabled
  const isFunEquivalenceEnabled = useMemo(() => {
    if (!tenantProducts) return false;
    const walkingProduct = tenantProducts.find(
      (p) => p.productCode === 'walking' || p.category === 'walking'
    );
    if (!walkingProduct) return false;
    // Check if fun_equivalence feature is enabled in featureConfig
    return walkingProduct.featureConfig?.['fun_equivalence'] === 'true' ||
           walkingProduct.featureConfig?.['fun_equivalence'] === '1' ||
           walkingProduct.featureConfig?.['fun_equivalence'] === 'enabled';
  }, [tenantProducts]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: 'step-config' as const, label: '步数积分配置', icon: <SettingOutlined /> },
    ];
    if (isFunEquivalenceEnabled) {
      baseTabs.push({
        key: 'fun-equiv' as const,
        label: '趣味换算',
        icon: <SmileOutlined />,
      });
    }
    return baseTabs;
  }, [isFunEquivalenceEnabled]);

  // If active tab is fun-equiv and it becomes disabled, switch to step-config
  if (activeTab === 'fun-equiv' && !isFunEquivalenceEnabled) {
    setActiveTab('step-config');
  }

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

      {/* Tab Content */}
      <div>
        {activeTab === 'step-config' && <StepCalcConfig />}
        {activeTab === 'fun-equiv' && <FunEquivalenceConfig />}
      </div>
    </div>
  );
};

export default WalkingManagement;
