import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTenantProducts } from '@/api/tenantProducts';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on whether a feature is enabled
 * in the tenant's product configuration.
 *
 * Feature keys come from TenantProduct.featureConfig entries where the value
 * is truthy (true, 'true', '1', 1).
 */
const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback = null }) => {
  const { data: tenantProducts } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
    retry: 1,
    staleTime: 60_000,
  });

  const isEnabled = React.useMemo(() => {
    if (!tenantProducts) return false;
    for (const p of tenantProducts) {
      if (p.featureConfig) {
        const val = p.featureConfig[feature];
        if (val === true || val === 'true' || val === '1' || val === 1) {
          return true;
        }
      }
    }
    return false;
  }, [tenantProducts, feature]);

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default FeatureGuard;
