import { apiClient } from './request';

export interface TenantBranding {
  id: number;
  tenantId: number;
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

// Get current tenant branding configuration
export const getCurrentBranding = async () => {
  const res = await apiClient.get<TenantBranding>('/tenant/branding');
  return res.data;
};

// Update current tenant branding configuration
export const updateBranding = async (data: UpdateBrandingRequest) => {
  const res = await apiClient.put<TenantBranding>('/tenant/branding', data);
  return res.data;
};

// Upload logo
export const uploadLogo = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ url: string }>('/tenant/branding/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Delete logo
export const deleteLogo = async () => {
  await apiClient.delete('/tenant/branding/logo');
};

// Get branding by tenant ID (public API)
export const getBrandingByTenantId = async (tenantId: number) => {
  const res = await apiClient.get<TenantBranding>(`/tenant/branding/public/tenant/${tenantId}`);
  return res.data;
};

// Get branding by tenant domain (public API)
export const getBrandingByDomain = async (domain: string) => {
  const res = await apiClient.get<TenantBranding>(`/tenant/branding/public/domain/${domain}`);
  return res.data;
};
