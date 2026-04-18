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

// Get current tenant branding configuration
export const getCurrentBranding = async (): Promise<TenantBranding> => {
  const res = await apiClient.get('/branding');
  return res as unknown as TenantBranding;
};

// Update current tenant branding configuration
export const updateBranding = async (data: UpdateBrandingRequest): Promise<TenantBranding> => {
  const res = await apiClient.put('/branding', data);
  return res as unknown as TenantBranding;
};

// Upload logo
export const uploadLogo = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/branding/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res as unknown as { url: string };
};

// Delete logo
export const deleteLogo = async () => {
  await apiClient.delete('/branding/logo');
};

// Get branding by tenant ID (public API)
export const getBrandingByTenantId = async (tenantId: number): Promise<TenantBranding> => {
  const res = await apiClient.get(`/branding/public/tenant/${tenantId}`);
  return res as unknown as TenantBranding;
};

// Get branding by tenant domain (public API)
export const getBrandingByDomain = async (domain: string): Promise<TenantBranding> => {
  const res = await apiClient.get(`/branding/public/domain/${domain}`);
  return res as unknown as TenantBranding;
};
