import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import MallPage from './MallPage';

// Mock the hooks
vi.mock('@/components/BrandingProvider', () => ({
  useBranding: () => ({ primaryColor: '#1890ff' }),
}));

vi.mock('@/store/featureStore', () => ({
  useFeatureStore: () => ({
    isEnabled: (feature: string) => feature === 'mall.shelf',
  }),
}));

// Mock the page components
vi.mock('../Products', () => ({
  default: ({ hideHeader }: { hideHeader?: boolean }) => (
    <div data-testid="products-page" data-hide-header={hideHeader || false}>
      Products
    </div>
  ),
}));

vi.mock('../Orders', () => ({
  default: ({ hideHeader }: { hideHeader?: boolean }) => (
    <div data-testid="orders-page" data-hide-header={hideHeader || false}>
      Orders
    </div>
  ),
}));

vi.mock('../MallShelf', () => ({
  default: ({ hideHeader }: { hideHeader?: boolean }) => (
    <div data-testid="mallshelf-page" data-hide-header={hideHeader || false}>
      MallShelf
    </div>
  ),
}));

vi.mock('../MallReports', () => ({
  default: ({ hideHeader }: { hideHeader?: boolean }) => (
    <div data-testid="mallreports-page" data-hide-header={hideHeader || false}>
      MallReports
    </div>
  ),
}));

describe('MallPage', () => {
  it('renders the page title correctly', () => {
    render(<MallPage />);
    expect(screen.getByText('积分商城')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<MallPage />);
    expect(screen.getByText('管理商品、上架、订单和报表')).toBeInTheDocument();
  });

  it('renders required tabs', () => {
    render(<MallPage />);
    expect(screen.getByText('数据概览')).toBeInTheDocument();
    expect(screen.getByText('商品管理')).toBeInTheDocument();
    expect(screen.getByText('订单管理')).toBeInTheDocument();
  });

  it('renders conditional shelf tab when feature is enabled', () => {
    render(<MallPage />);
    expect(screen.getByText('商品上架')).toBeInTheDocument();
  });
});
