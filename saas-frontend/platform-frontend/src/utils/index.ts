import dayjs from 'dayjs';
export { logger, apiLogger, routeLogger, componentLogger } from './logger';
export type { LogLevel } from './logger';

/**
 * Format a date to YYYY-MM-DD string
 */
export const formatDate = (date: string | Date | number, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

/**
 * Format a date with time: YYYY-MM-DD HH:mm:ss
 */
export const formatDateTime = (date: string | Date | number): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Format points with thousands separator
 */
export const formatPoints = (points: number): string => {
  return points.toLocaleString('zh-CN');
};

/**
 * Format relative time (e.g., "3天前", "刚刚")
 */
export const formatRelativeTime = (date: string | Date | number): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = now.diff(target, 'day');
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(date);
};

/**
 * Validate Chinese mobile phone number
 */
export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

/**
 * Mask phone number: 138****1234
 */
export const maskPhone = (phone: string): string => {
  if (phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * Mask email: t***@example.com
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 3 ? local[0] + '***' + local[local.length - 1] : local + '***';
  return `${maskedLocal}@${domain}`;
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Get level name from points
 */
export const getLevelName = (totalPoints: number): { level: number; name: string } => {
  if (totalPoints >= 50000) return { level: 5, name: '钻石' };
  if (totalPoints >= 20000) return { level: 4, name: '铂金' };
  if (totalPoints >= 5000) return { level: 3, name: '黄金' };
  if (totalPoints >= 1000) return { level: 2, name: '白银' };
  return { level: 1, name: '青铜' };
};

/**
 * Get level color
 */
export const getLevelColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: '#cd7f32',
    2: '#c0c0c0',
    3: '#ffd700',
    4: '#e5e4e2',
    5: '#b9f2ff',
  };
  return colors[level] || '#999';
};

/**
 * Calculate consecutive check-in bonus percentage
 */
export const getConsecutiveBonus = (consecutiveDays: number): number => {
  return Math.min(Math.floor(consecutiveDays / 7) * 0.1, 0.5);
};

/**
 * Generate a random string
 */
export const randomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Extract array from API response: handles raw array, { data: [...] }, or { data: { records: [...] } } (pagination).
 * Returns an empty array if data is not an array or not properly structured.
 */
export const extractArray = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    // Direct paginated response (already unwrapped from Result wrapper)
    if ('records' in data && Array.isArray((data as { records: unknown }).records)) {
      return (data as { records: T[] }).records;
    }
    if ('data' in data) {
      const inner = (data as { data: unknown }).data;
      if (Array.isArray(inner)) return inner as T[];
      if (inner && typeof inner === 'object' && 'records' in inner) {
        return (inner as { records: T[] }).records;
      }
    }
  }
  return [];
};
