import { apiClient } from './request';

export interface WalkingConfig {
  stepsThreshold: number;
  pointsCoefficient: number; // stored as integer (e.g., 1 = 0.01)
  dailyCap: number;
}

export interface FunEquivalenceTemplate {
  name: string;
  stepsPer: number;
  icon?: string;
}

/**
 * Get walking configuration for current tenant.
 */
export const getWalkingConfig = async (): Promise<WalkingConfig> => {
  const res = await apiClient.get('/walking/config');
  return (res as any)?.data || res || { stepsThreshold: 1000, pointsCoefficient: 1, dailyCap: 50 };
};

/**
 * Update walking configuration for current tenant.
 */
export const updateWalkingConfig = async (config: WalkingConfig): Promise<void> => {
  await apiClient.put('/walking/config', config);
};

/**
 * Get fun equivalence templates for current tenant.
 */
export const getEquivalenceTemplates = async (): Promise<FunEquivalenceTemplate[]> => {
  const res = await apiClient.get('/walking/equivalence-templates');
  return (res as any)?.data || res || [];
};

/**
 * Update fun equivalence templates for current tenant.
 */
export const updateEquivalenceTemplates = async (templates: FunEquivalenceTemplate[]): Promise<void> => {
  await apiClient.put('/walking/equivalence-templates', templates);
};
