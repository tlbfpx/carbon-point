import { create } from 'zustand';
import { getTenantProducts, TenantProduct } from '@/api/tenantProducts';

interface ProductState {
  products: TenantProduct[];
  loading: boolean;
  loaded: boolean;
  fetchProducts: () => Promise<void>;
  isProductEnabled: (code: string) => boolean;
  getFeatureConfig: (productCode: string, featureCode: string) => string | undefined;
}

export const useProductStore = create<ProductState>()((set, get) => ({
  products: [],
  loading: false,
  loaded: false,

  fetchProducts: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const products = await getTenantProducts();
      set({ products, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  isProductEnabled: (code: string) => {
    const { products } = get();
    return products.some((p) => p.productCode === code);
  },

  getFeatureConfig: (productCode: string, featureCode: string) => {
    const { products } = get();
    const product = products.find((p) => p.productCode === productCode);
    return product?.featureConfig?.[featureCode];
  },
}));
