import { create } from 'zustand';
import { fetchFeatures, FeatureMap } from '../api/features';

interface FeatureState {
  features: FeatureMap;
  loaded: boolean;
  load: () => Promise<void>;
  isEnabled: (code: string) => boolean;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  features: {},
  loaded: false,
  load: async () => {
    const features = await fetchFeatures();
    set({ features, loaded: true });
  },
  isEnabled: (code: string) => get().features[code] === true,
}));
