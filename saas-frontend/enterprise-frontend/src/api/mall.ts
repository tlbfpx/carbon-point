import { apiClient } from './request';

// Types for the enterprise shelf system
export interface ShelfProduct {
  id: string;
  platformProductId: string;
  name: string;
  type: 'coupon' | 'recharge' | 'privilege';
  description?: string;
  price: number; // RMB cents
  image?: string;
  pointsExchangeRate: number;
  pointsPrice: number; // computed: price * pointsExchangeRate / 100
  stock?: number;
  status: 'active' | 'inactive';
  shelfStatus: 'on' | 'off';
  sortOrder?: number;
  createdAt: string;
}

export interface AvailableProduct {
  id: string;
  name: string;
  type: 'coupon' | 'recharge' | 'privilege';
  description?: string;
  price: number; // RMB cents
  image?: string;
  status: 'active' | 'inactive';
}

export interface MallReportParams {
  type?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

export interface ExchangeVolumeItem {
  date: string;
  count: number;
  totalPoints: number;
}

export interface PointsConsumptionItem {
  date: string;
  consumed: number;
}

export interface ProductPopularityItem {
  productId: string;
  productName: string;
  type: string;
  exchangeCount: number;
  totalPoints: number;
  rank: number;
}

export interface MallReportData {
  exchangeVolume: ExchangeVolumeItem[];
  pointsConsumption: PointsConsumptionItem[];
  productPopularity: ProductPopularityItem[];
}

// Fetch enterprise-shelved products
export const fetchShelfProducts = async () => {
  const res = await apiClient.get('/enterprise/mall/shelf');
  return res;
};

// Add a platform product to the enterprise shelf
export const addToShelf = async (data: { platformProductId: string; pointsExchangeRate?: number }) => {
  const res = await apiClient.post('/enterprise/mall/shelf', data);
  return res;
};

// Remove a product from the enterprise shelf
export const removeFromShelf = async (shelfProductId: string) => {
  const res = await apiClient.delete(`/enterprise/mall/shelf/${shelfProductId}`);
  return res;
};

// Fetch available platform products (not yet shelved by this enterprise)
export const fetchAvailableProducts = async () => {
  const res = await apiClient.get('/enterprise/mall/available');
  return res;
};

// Update the exchange rate for a shelved product
export const updateExchangeRate = async (shelfProductId: string, pointsExchangeRate: number) => {
  const res = await apiClient.put(`/enterprise/mall/shelf/${shelfProductId}/rate`, { pointsExchangeRate });
  return res;
};

// Fetch mall report data with optional filters
export const fetchMallReports = async (params?: MallReportParams): Promise<MallReportData> => {
  const res = await apiClient.get('/enterprise/mall/reports/exchange-stats', { params }) as { data?: MallReportData };
  return (res as any).data ?? res as unknown as MallReportData;
};
