import React from 'react';
import { useFeatureStore } from '../store/featureStore';

interface FeatureGuardProps {
  /** Feature key to check, e.g. "stair.floor_points" */
  feature: string;
  /** Fallback content when feature is disabled */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on whether a feature is enabled
 * for the current tenant, as determined by the feature store
 * (loaded from /api/enterprise/features).
 */
const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, fallback = null, children }) => {
  const isEnabled = useFeatureStore((s) => s.isEnabled(feature));
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;
