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

/** A single tier row in the step-to-points tier editor. */
export interface StepTier {
  minSteps: number;
  maxSteps: number | null; // null means unlimited
  points: number;
}

/** A custom fun-conversion item (e.g. "1克大米"). */
export interface FunConversionItem {
  itemName: string;
  unit: string;
  caloriesPerUnit: number;
  icon: string;
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

// ============================================================
// Tier rules (step tier editor)
// ============================================================

/**
 * Fetch the current step-tier rules for the tenant.
 */
export const fetchTierRules = async (): Promise<StepTier[]> => {
  const res = await apiClient.get('/enterprise/walking/tiers');
  return (res as any)?.data || res || [];
};

/**
 * Save step-tier rules for the tenant.
 */
export const saveTierRules = async (tiers: StepTier[]): Promise<void> => {
  await apiClient.put('/enterprise/walking/tiers', { tiers });
};

// ============================================================
// Fun conversions (custom items)
// ============================================================

/**
 * Fetch the current fun conversion items for the tenant.
 */
export const fetchFunConversions = async (): Promise<FunConversionItem[]> => {
  const res = await apiClient.get('/enterprise/walking/conversions');
  return (res as any)?.data || res || [];
};

/**
 * Save fun conversion items for the tenant.
 */
export const saveFunConversions = async (items: FunConversionItem[]): Promise<void> => {
  await apiClient.put('/enterprise/walking/conversions', { items });
};
