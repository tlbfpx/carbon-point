import { apiClient } from './request';

export interface FeatureMap {
  [featureCode: string]: boolean;
}

export const fetchFeatures = (): Promise<FeatureMap> =>
  apiClient.get('/api/enterprise/features').then(r => r.data?.data ?? {});
