import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchFeatures, FeatureMap } from '../api/features';
import { FEATURES } from '../constants/features';
import { logger } from '../utils';

interface FeatureState {
  features: FeatureMap;
  loaded: boolean;
  preferences: {
    useLegacyUI: boolean;
  };
  load: () => Promise<void>;
  isEnabled: (code: string) => boolean;
  setUseLegacyUI: (useLegacy: boolean) => void;
}

// Default features: enable new features by default
const DEFAULT_FEATURES: FeatureMap = {
  [FEATURES.UNIFIED_RESOURCES]: true,
};

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      features: DEFAULT_FEATURES,
      loaded: false,
      preferences: {
        useLegacyUI: false,
      },
      load: async () => {
        try {
          const backendFeatures = await fetchFeatures();
          // Merge backend features with defaults (backend takes precedence)
          const mergedFeatures = {
            ...DEFAULT_FEATURES,
            ...backendFeatures,
          };
          set({ features: mergedFeatures, loaded: true });
          logger.info(`[FeatureStore] Loaded features: ${JSON.stringify(mergedFeatures)}`);
        } catch (error) {
          logger.warn('[FeatureStore] Failed to load features from backend, using defaults:', error);
          // If backend fails, use defaults but mark as loaded
          set({ features: DEFAULT_FEATURES, loaded: true });
        }
      },
      isEnabled: (code: string) => {
        const { features } = get();
        const enabled = features[code] === true;
        logger.debug(`[FeatureStore] Feature ${code} check: ${enabled}`);
        return enabled;
      },
      setUseLegacyUI: (useLegacy: boolean) => {
        set({ preferences: { useLegacyUI: useLegacy } });
        logger.info(`[FeatureStore] User preference updated: useLegacyUI=${useLegacy}`);
      },
    }),
    {
      name: 'carbon-point-feature-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
