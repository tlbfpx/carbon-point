import { apiClient } from './request';

export interface TenantBranding {
  id: number;
  tenantId: number;
  tenantName?: string;
  logoUrl?: string;
  themeType: 'preset' | 'custom';
  presetTheme?: 'default-blue' | 'tech-green' | 'vibrant-orange' | 'deep-purple';
  primaryColor?: string;
  secondaryColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBrandingRequest {
  themeType?: 'preset' | 'custom';
  presetTheme?: 'default-blue' | 'tech-green' | 'vibrant-orange' | 'deep-purple';
  primaryColor?: string;
  secondaryColor?: string;
}

// API response wrapper from backend
interface ApiResponse<T> {
  code: string;
  data: T;
  message: string;
}

// Get current tenant branding configuration
export const getCurrentBranding = async () => {
  const res = await apiClient.get<ApiResponse<TenantBranding>>('/branding');
  return res.data.data;
};

// Update current tenant branding configuration
export const updateBranding = async (data: UpdateBrandingRequest) => {
  const res = await apiClient.put<ApiResponse<TenantBranding>>('/branding', data);
  return res.data.data;
};

// Upload logo
export const uploadLogo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<{ url: string }>>('/branding/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
};

// Delete logo
export const deleteLogo = async () => {
  await apiClient.delete('/branding/logo');
};

// Get branding by tenant ID (public API)
export const getBrandingByTenantId = async (tenantId: number) => {
  const res = await apiClient.get<ApiResponse<TenantBranding>>(`/branding/public/tenant/${tenantId}`);
  return res.data.data;
};

// Get branding by tenant domain (public API)
export const getBrandingByDomain = async (domain: string) => {
  const res = await apiClient.get<ApiResponse<TenantBranding>>(`/branding/public/domain/${domain}`);
  return res.data.data;
};
