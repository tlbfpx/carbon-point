import { describe, it, expect } from 'vitest';
import { isLocationWithinRange } from '../utils/wechat';

describe('WeChat location utilities', () => {
  describe('isLocationWithinRange', () => {
    it('returns true when user is within range of target', () => {
      // Same location should always be within range
      const result = isLocationWithinRange(31.2304, 121.4737, 31.2304, 121.4737, 100);
      expect(result).toBe(true);
    });

    it('returns true when user is within the distance threshold', () => {
      // Roughly 111 meters per degree at equator, use a slightly larger threshold
      const result = isLocationWithinRange(31.2304, 121.4737, 31.2314, 121.4737, 112);
      expect(result).toBe(true);
    });

    it('returns false when user is beyond max distance', () => {
      // Roughly 111 meters per degree
      const result = isLocationWithinRange(31.2304, 121.4737, 31.2314, 121.4737, 100);
      expect(result).toBe(false);
    });

    it('returns true for small distances with default 1000m limit', () => {
      // 0.001 degree ≈ 111 meters
      const result = isLocationWithinRange(31.2304, 121.4737, 31.2314, 121.4737, 1000);
      expect(result).toBe(true);
    });

    it('handles negative coordinates', () => {
      // São Paulo, Brazil
      const result = isLocationWithinRange(-23.5505, -46.6333, -23.5505, -46.6333, 100);
      expect(result).toBe(true);
    });
  });
});
