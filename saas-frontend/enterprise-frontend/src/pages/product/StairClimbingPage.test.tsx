import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StairClimbingPage from './StairClimbingPage';

// Mock the hooks
vi.mock('@/components/BrandingProvider', () => ({
  useBranding: () => ({ primaryColor: '#1890ff' }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { tenantId: 'test-tenant' } }),
}));

vi.mock('@/store/featureStore', () => ({
  useFeatureStore: () => ({
    isEnabled: (feature: string) => {
      const enabledFeatures = ['time_slot', 'consecutive_reward'];
      return enabledFeatures.includes(feature);
    },
  }),
}));

// Mock the tab components
vi.mock('../rules/TimeSlotTab', () => ({
  default: () => <div data-testid="timeslot-tab">TimeSlotTab</div>,
}));

vi.mock('../rules/ConsecutiveTab', () => ({
  default: () => <div data-testid="consecutive-tab">ConsecutiveTab</div>,
}));

vi.mock('../rules/LevelTab', () => ({
  default: () => <div data-testid="level-tab">LevelTab</div>,
}));

vi.mock('../rules/SpecialTab', () => ({
  default: () => <div data-testid="special-tab">SpecialTab</div>,
}));

vi.mock('../rules/DailyCapTab', () => ({
  default: () => <div data-testid="dailycap-tab">DailyCapTab</div>,
}));

vi.mock('../rules/WorkdayFilterTab', () => ({
  default: () => <div data-testid="workday-tab">WorkdayFilterTab</div>,
}));

describe('StairClimbingPage', () => {
  it('renders the page title correctly', () => {
    render(<StairClimbingPage />);
    expect(screen.getByText('爬楼积分管理')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<StairClimbingPage />);
    expect(screen.getByText('管理爬楼签到规则与数据')).toBeInTheDocument();
  });

  it('renders the overview tab by default', () => {
    render(<StairClimbingPage />);
    expect(screen.getByText('数据概览')).toBeInTheDocument();
  });

  it('renders enabled feature tabs', () => {
    render(<StairClimbingPage />);
    expect(screen.getByText('规则配置')).toBeInTheDocument();
    expect(screen.getByText('连续奖励')).toBeInTheDocument();
  });
});
