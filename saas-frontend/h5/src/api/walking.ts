import { apiClient } from './request';

export interface FunEquivalence {
  name: string;
  icon: string;
  quantity: number;
}

export interface WalkingStatus {
  todaySteps: number;
  stepsThreshold: number;
  claimablePoints: number;
  claimed: boolean;
  funEquivalences: FunEquivalence[];
}

export interface WalkingRecord {
  id: string;
  date: string;
  steps: number;
  pointsEarned: number;
  source: string;
}

const ITEM_ICONS: Record<string, string> = {
  '米饭': '🍚',
  '香蕉': '🍌',
  '苹果': '🍎',
  '牛奶': '🥛',
  '鸡蛋': '🥚',
  '面包': '🍞',
  '可乐': '🥤',
  '汉堡': '🍔',
  '薯条': '🍟',
};

const ITEM_ICON_LIST = Object.keys(ITEM_ICONS);

function mapIcon(item: string): string {
  if (ITEM_ICONS[item]) return ITEM_ICONS[item];
  // Fallback: cycle through available icons based on item name
  const idx = item ? item.charCodeAt(0) % ITEM_ICON_LIST.length : 0;
  return ITEM_ICONS[ITEM_ICON_LIST[idx]] || '🏃';
}

export const getWalkingStatus = async (): Promise<WalkingStatus> => {
  const res = await apiClient.get('/walking/today');
  // Interceptor unwraps Axios, res = Result<WalkingTodayDTO>, res.data = DTO
  const dto = res.data;
  return {
    todaySteps: dto?.todaySteps ?? 0,
    stepsThreshold: dto?.stepsThreshold ?? 1000,
    claimablePoints: dto?.claimablePoints ?? 0,
    claimed: dto?.claimed ?? false,
    funEquivalences: (dto?.funEquivalences || []).map((fe: any) => ({
      name: fe.item || fe.description || '',
      icon: mapIcon(fe.item || ''),
      quantity: Math.round(fe.quantity ?? 0),
    })),
  };
};

export const claimWalkingPoints = async (source: string): Promise<{ pointsEarned: number; success: boolean; message?: string }> => {
  const res = await apiClient.post('/walking/claim', { source });
  const dto = res.data;
  return {
    success: dto?.success ?? false,
    pointsEarned: dto?.pointsAwarded ?? 0,
    message: dto?.message,
  };
};

export const getWalkingHistory = async (page: number, size: number): Promise<{ records: WalkingRecord[]; total: number }> => {
  const res = await apiClient.get('/walking/records', { params: { page, size } });
  const pageData = res.data;
  return {
    records: (pageData?.records || []).map((r: any) => ({
      id: String(r.id),
      date: r.date,
      steps: r.steps ?? 0,
      pointsEarned: r.pointsEarned ?? 0,
      source: 'manual',
    })),
    total: pageData?.total ?? 0,
  };
};
