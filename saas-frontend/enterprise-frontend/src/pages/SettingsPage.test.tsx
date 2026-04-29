import { describe, it, expect } from 'vitest';
import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
  it('exports the component correctly', () => {
    expect(SettingsPage).toBeDefined();
    expect(typeof SettingsPage).toBe('function');
  });
});
