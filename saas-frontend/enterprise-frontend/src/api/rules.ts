import { apiClient } from './request';

export interface TimeSlotRule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  basePoints: number;
  enabled: boolean;
  sortOrder: number;
  config: string;
}

export interface ConsecutiveReward {
  days: number;
  bonusPoints: number;
}

export interface SpecialDate {
  id: string;
  date: string;
  multiplier: number;
  description?: string;
}

export interface LevelCoefficient {
  level: number;
  coefficient: number;
}

export interface DailyCap {
  maxPoints: number;
  id?: string;
}

// Helper to fetch rules by type from backend
const fetchRulesByType = async (tenantId: string, type: string) => {
  const res = await apiClient.get('/point-rules/list', { params: { type } }) as any[];
  const allRules = res || [];
  return allRules
    .filter((r: any) => r.type === type)
    .map((r: any) => {
      let config: any = {};
      try {
        config = JSON.parse(r.config || '{}');
      } catch {}
      return {
        id: String(r.id),
        name: r.name,
        enabled: r.enabled,
        sortOrder: r.sortOrder || 0,
        config,
        type: r.type,
      };
    });
};

// Map time slot CRUD to the backend PointRulesController

export const getTimeSlotRules = async (_tenantId: string) => {
  const res = await apiClient.get('/point-rules/enabled') as any[];
  // Filter to time_slot type and parse config for display
  const allRules = res || [];
  return allRules
    .filter((r: any) => r.type === 'time_slot')
    .map((r: any) => {
      let startTime = '';
      let endTime = '';
      let basePoints = 0;
      try {
        const config = JSON.parse(r.config || '{}');
        startTime = config.startTime || '';
        endTime = config.endTime || '';
        basePoints = config.basePoints || 0;
      } catch {}
      return {
        id: String(r.id),
        name: r.name,
        startTime,
        endTime,
        basePoints,
        enabled: r.enabled,
        sortOrder: r.sortOrder || 0,
        config: r.config,
      };
    });
};

export const createTimeSlotRule = async (data: any) => {
  const config = JSON.stringify({
    startTime: data.startTime,
    endTime: data.endTime,
    minPoints: data.basePoints || 1,
    maxPoints: data.basePoints || 10,
  });
  const res = await apiClient.post('/point-rules', {
    type: 'time_slot',
    name: data.name,
    config,
    enabled: data.enabled !== false,
    sortOrder: data.sortOrder || 0,
  });
  return res;
};

export const updateTimeSlotRule = async (id: string, data: Partial<TimeSlotRule>) => {
  const config = JSON.stringify({
    startTime: data.startTime,
    endTime: data.endTime,
    minPoints: data.basePoints || 1,
    maxPoints: data.basePoints || 10,
  });
  const res = await apiClient.put('/point-rules', {
    id: Number(id),
    name: data.name,
    config,
    enabled: data.enabled,
    sortOrder: data.sortOrder,
  });
  return res;
};

export const deleteTimeSlotRule = async (id: string) => {
  const res = await apiClient.delete(`/point-rules/${id}`);
  return res;
};

// These rule types are stored in point_rules table with their respective types

// Consecutive rewards are calculated by the point engine, not stored as rules
export const getConsecutiveRewards = async (_tenantId: string) => {
  return [];
};

export const updateConsecutiveRewards = async (_tenantId: string, _data: ConsecutiveReward[]) => {
  return [];
};

export const getSpecialDates = async (_tenantId: string) => {
  const rules = await fetchRulesByType(_tenantId, 'special_date');
  return rules.map((r: any) => ({
    id: r.id,
    date: r.config.date || r.name,
    multiplier: r.config.multiplier || 1,
    description: r.config.description || '',
  }));
};

export const createSpecialDate = async (data: Partial<SpecialDate> & { tenantId: string }) => {
  const res = await apiClient.post('/point-rules', {
    type: 'special_date',
    name: data.date,
    config: JSON.stringify({
      date: data.date,
      multiplier: data.multiplier || 1,
      description: data.description || '',
    }),
    enabled: true,
    sortOrder: 0,
  });
  return res;
};

export const deleteSpecialDate = async (id: string) => {
  const res = await apiClient.delete(`/point-rules/${id}`);
  return res;
};

export const getLevelCoefficients = async (_tenantId: string) => {
  const rules = await fetchRulesByType(_tenantId, 'level_coefficient');
  return rules.map((r: any) => ({
    level: r.config.level || 1,
    coefficient: r.config.coefficient || 1,
    id: r.id,
  }));
};

export const updateLevelCoefficients = async (_tenantId: string, data: LevelCoefficient[]) => {
  // Delete existing and recreate
  const existing = await fetchRulesByType(_tenantId, 'level_coefficient');
  await Promise.all(existing.map((r: any) => apiClient.delete(`/point-rules/${r.id}`)));
  await Promise.all(data.map(d =>
    apiClient.post('/point-rules', {
      type: 'level_coefficient',
      name: `Level ${d.level}`,
      config: JSON.stringify({ level: d.level, coefficient: d.coefficient }),
      enabled: true,
      sortOrder: d.level,
    })
  ));
  return [];
};

export const getDailyCap = async (_tenantId: string) => {
  const rules = await fetchRulesByType(_tenantId, 'daily_cap');
  if (rules.length > 0) {
    return { maxPoints: rules[0].config.maxPoints || 500, id: rules[0].id };
  }
  return { maxPoints: 500 };
};

export const updateDailyCap = async (_tenantId: string, data: DailyCap) => {
  const existing = await fetchRulesByType(_tenantId, 'daily_cap');
  const payload = {
    type: 'daily_cap',
    name: 'Daily Cap',
    config: JSON.stringify({ maxPoints: data.maxPoints }),
    enabled: true,
  };
  if (existing.length > 0) {
    await apiClient.put('/point-rules', { id: Number(existing[0].id), ...payload });
  } else {
    await apiClient.post('/point-rules', { ...payload, sortOrder: 0 });
  }
  return [];
};
