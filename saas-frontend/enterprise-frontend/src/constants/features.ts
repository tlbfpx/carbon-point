/**
 * Feature flag constants
 * Keep this in sync with backend feature definitions
 */
export const FEATURES = {
  /** Unified resources management (Phase 2 experimental) */
  UNIFIED_RESOURCES: 'unified-resources',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];
