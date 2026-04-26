import React from 'react';
import { useFeatureStore } from '../store/featureStore';

interface Props {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const FeatureGuard: React.FC<Props> = ({ feature, fallback = null, children }) => {
  const isEnabled = useFeatureStore(s => s.isEnabled(feature));
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;
