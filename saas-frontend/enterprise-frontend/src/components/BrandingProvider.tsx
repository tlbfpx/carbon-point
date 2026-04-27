import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentBranding, getBrandingByTenantId, TenantBranding } from '@/api/branding';
import { useAuthStore } from '@/store/authStore';
import { useLocation } from 'react-router-dom';

// Preset theme color map
const PRESET_COLORS: Record<string, string> = {
  'default-blue': '#1890ff',
  'tech-green': '#52c41a',
  'vibrant-orange': '#fa8c16',
  'deep-purple': '#722ed1',
};

const DEFAULT_PRIMARY = '#1890ff';

interface BrandingContextType {
  branding: TenantBranding | null;
  primaryColor: string;
  isLoading: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  primaryColor: DEFAULT_PRIMARY,
  isLoading: true,
  refreshBranding: () => {},
});

export const useBranding = () => useContext(BrandingContext);

// Parse tenantId from URL query params (for login page)
const getTenantIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get('tenantId');
  if (tenantId) {
    const parsed = parseInt(tenantId, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const location = useLocation();
  const [initialTenantId] = useState(() => getTenantIdFromUrl());

  // For authenticated users - use current tenant branding
  const { data: authBranding, isLoading: authLoading } = useQuery<TenantBranding>({
    queryKey: ['tenantBranding'],
    queryFn: getCurrentBranding,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // For login page - load branding by tenantId from URL if available
  const { data: publicBranding, isLoading: publicLoading } = useQuery<TenantBranding>({
    queryKey: ['publicBranding', initialTenantId],
    queryFn: () => initialTenantId ? getBrandingByTenantId(initialTenantId) : Promise.reject(new Error('No tenantId')),
    enabled: !isAuthenticated && !!initialTenantId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const branding = isAuthenticated ? authBranding : publicBranding;
  const isLoading = isAuthenticated ? authLoading : (!!initialTenantId && publicLoading);

  const primaryColor = useMemo(() => {
    if (!branding) return DEFAULT_PRIMARY;
    if (branding.themeType === 'preset' && branding.presetTheme) {
      return PRESET_COLORS[branding.presetTheme] || DEFAULT_PRIMARY;
    }
    return branding.primaryColor || DEFAULT_PRIMARY;
  }, [branding]);

  const themeConfig = useMemo(
    () => ({
      token: {
        colorPrimary: primaryColor,
        borderRadius: 6,
      },
      algorithm: antdTheme.defaultAlgorithm,
    }),
    [primaryColor],
  );

  const refreshBranding = () => {
    queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
    queryClient.invalidateQueries({ queryKey: ['publicBranding'] });
  };

  const contextValue = useMemo(
    () => ({
      branding: branding ?? null,
      primaryColor,
      isLoading,
      refreshBranding,
    }),
    [branding, primaryColor, isLoading],
  );

  return (
    <BrandingContext.Provider value={contextValue}>
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        {children}
      </ConfigProvider>
    </BrandingContext.Provider>
  );
};

export default BrandingProvider;
