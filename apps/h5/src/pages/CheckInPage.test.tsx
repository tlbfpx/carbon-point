import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfigProvider } from 'antd-mobile';

// Mock dependencies at module level BEFORE importing components
vi.mock('@/api/checkin', () => ({
  doCheckIn: vi.fn(),
  getTimeSlots: vi.fn(),
  getTodayCheckInStatus: vi.fn(),
  TimeSlotResponse: {},
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { userId: 'test-user-1', tenantId: 'test-tenant-1' },
    logout: vi.fn(),
  })),
}));

vi.mock('@/store', () => ({
  persist: (fn: Function) => fn,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@carbon-point/utils', () => ({
  routeLogger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  apiLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  componentLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import CheckInPage from '../pages/CheckInPage';
import { getTimeSlots } from '@/api/checkin';

const mockTimeSlots = [
  { ruleId: 1, name: '早间时段', startTime: '07:00:00', endTime: '09:00:00', status: 'available' as const },
  { ruleId: 2, name: '午间时段', startTime: '12:00:00', endTime: '13:00:00', status: 'not_started' as const },
  { ruleId: 3, name: '晚间时段', startTime: '18:00:00', endTime: '20:00:00', status: 'checked_in' as const },
];

const { useQuery } = await import('@tanstack/react-query');

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ConfigProvider>{ui}</ConfigProvider>);
};

describe('CheckInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuery as ReturnType<typeof vi.fn>).mockImplementation((options: { queryKey: readonly unknown[] }) => {
      if (options.queryKey[0] === 'timeSlots') {
        return { data: { data: mockTimeSlots }, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    });
    (getTimeSlots as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockTimeSlots,
    });
  });

  it('renders time slot cards when data loads', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('早间时段')).toBeTruthy();
    });
    expect(screen.getByText('午间时段')).toBeTruthy();
    expect(screen.getByText('晚间时段')).toBeTruthy();
  });

  it('shows correct badge for available status', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('可打卡')).toBeTruthy();
    });
  });

  it('shows correct badge for checked_in status', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('已打卡')).toBeTruthy();
    });
  });

  it('shows correct badge for not_started status', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('未开始')).toBeTruthy();
    });
  });

  it('renders check-in instructions card', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('请确保已完成爬楼梯运动')).toBeTruthy();
    });
  });

  it('formats time range correctly', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getByText('07:00 - 09:00')).toBeTruthy();
    });
  });

  it('renders TabBar navigation', async () => {
    renderWithProviders(<CheckInPage />);
    await waitFor(() => {
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
      // There may be multiple "打卡" (one in time slot name, one in TabBar)
      const checkInItems = screen.getAllByText('打卡');
      expect(checkInItems.length).toBeGreaterThan(0);
      expect(screen.getAllByText('商城').length).toBeGreaterThan(0);
      expect(screen.getAllByText('卡券').length).toBeGreaterThan(0);
      expect(screen.getAllByText('我的').length).toBeGreaterThan(0);
    });
  });
});
