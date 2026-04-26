import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTenantProducts } from '@/api/tenantProducts';

interface FeatureGuardProps {
  /** Feature key to check, e.g. "walking.step_tier" */
  feature: string;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only when the specified feature is enabled
 * in the tenant's product configuration.
 *
 * Feature keys are dot-separated: the part before the dot is matched against
 * productCode or category; the full key is looked up in featureConfig.
 */
const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children }) => {
  const { data: tenantProducts } = useQuery({
    queryKey: ['tenant-products'],
    queryFn: getTenantProducts,
  });

  const isFeatureEnabled = React.useMemo(() => {
    if (!tenantProducts || tenantProducts.length === 0) return false;

    const [productPrefix] = feature.split('.');
    const product = tenantProducts.find(
      (p) => p.productCode === productPrefix || p.category === productPrefix,
    );
    if (!product) return false;

    const val = product.featureConfig?.[feature];
    return val === 'true' || val === '1' || val === 'enabled';
  }, [tenantProducts, feature]);

  if (!isFeatureEnabled) {
    return null;
  }

  return <>{children}</>;
};

export default FeatureGuard;
