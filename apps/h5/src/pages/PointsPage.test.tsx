import { describe, it, expect } from 'vitest';

// Level calculation logic extracted for unit testing
const levelConfig = [
  { level: 1, name: '青铜', min: 0, max: 999, color: '#cd7f32' },
  { level: 2, name: '白银', min: 1000, max: 4999, color: '#c0c0c0' },
  { level: 3, name: '黄金', min: 5000, max: 19999, color: '#ffd700' },
  { level: 4, name: '铂金', min: 20000, max: 49999, color: '#e5e4e2' },
  { level: 5, name: '钻石', min: 50000, max: Infinity, color: '#b9f2ff' },
];

function getLevelInfo(totalPoints: number) {
  const currentLevel = levelConfig.find((l) => totalPoints >= l.min && totalPoints <= l.max) || levelConfig[0];
  const nextLevel = levelConfig.find((l) => l.min > totalPoints);
  const progressInLevel = nextLevel
    ? ((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;
  return { currentLevel, nextLevel, progressInLevel };
}

describe('PointsPage level calculation', () => {
  it('returns Lv.1 Bronze for 0 points', () => {
    const result = getLevelInfo(0);
    expect(result.currentLevel.level).toBe(1);
    expect(result.currentLevel.name).toBe('青铜');
  });

  it('returns Lv.1 Bronze for 999 points', () => {
    const result = getLevelInfo(999);
    expect(result.currentLevel.level).toBe(1);
    expect(result.currentLevel.name).toBe('青铜');
  });

  it('returns Lv.2 Silver for 1000 points', () => {
    const result = getLevelInfo(1000);
    expect(result.currentLevel.level).toBe(2);
    expect(result.currentLevel.name).toBe('白银');
  });

  it('returns Lv.2 Silver for 4999 points', () => {
    const result = getLevelInfo(4999);
    expect(result.currentLevel.level).toBe(2);
    expect(result.currentLevel.name).toBe('白银');
  });

  it('returns Lv.3 Gold for 5000 points', () => {
    const result = getLevelInfo(5000);
    expect(result.currentLevel.level).toBe(3);
    expect(result.currentLevel.name).toBe('黄金');
  });

  it('returns Lv.4 Platinum for 20000 points', () => {
    const result = getLevelInfo(20000);
    expect(result.currentLevel.level).toBe(4);
    expect(result.currentLevel.name).toBe('铂金');
  });

  it('returns Lv.5 Diamond for 50000 points', () => {
    const result = getLevelInfo(50000);
    expect(result.currentLevel.level).toBe(5);
    expect(result.currentLevel.name).toBe('钻石');
  });

  it('returns Lv.5 Diamond for 100000 points', () => {
    const result = getLevelInfo(100000);
    expect(result.currentLevel.level).toBe(5);
    expect(result.currentLevel.name).toBe('钻石');
  });

  it('returns no nextLevel for max level', () => {
    const result = getLevelInfo(50000);
    expect(result.nextLevel).toBeUndefined();
  });

  it('returns 100% progress for max level', () => {
    const result = getLevelInfo(50000);
    expect(result.progressInLevel).toBe(100);
  });

  it('calculates progress between Lv.1 and Lv.2 correctly', () => {
    // At 500 points, should be 50% progress between 0-999
    const result = getLevelInfo(500);
    expect(result.progressInLevel).toBeCloseTo(50, 0);
  });

  it('calculates progress between Lv.2 and Lv.3 correctly', () => {
    // At 3000 points, should be 50% progress between 1000-4999
    const result = getLevelInfo(3000);
    expect(result.progressInLevel).toBeCloseTo(50, 0);
  });

  it('calculates progress between Lv.3 and Lv.4 correctly', () => {
    // At 12500 points, should be 50% progress between 5000-19999
    const result = getLevelInfo(12500);
    expect(result.progressInLevel).toBeCloseTo(50, 0);
  });
});
