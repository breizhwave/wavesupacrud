import { describe, it, expect } from 'vitest';
import { formatTemporal } from '../src/ui/format.js';

describe('formatTemporal', () => {
  it('formats timestamps as local date + time by default', () => {
    const local = new Date(2026, 5, 1, 14, 30, 45); // June 1st, local time
    expect(formatTemporal(local.toISOString())).toBe('2026-06-01 14:30');
  });

  it('drops the time part in date mode', () => {
    const local = new Date(2026, 11, 31, 23, 59);
    expect(formatTemporal(local.toISOString(), 'date')).toBe('2026-12-31');
  });

  it('passes plain dates through without timezone shifting', () => {
    expect(formatTemporal('2026-07-13')).toBe('2026-07-13');
    expect(formatTemporal('2026-07-13', 'date')).toBe('2026-07-13');
  });

  it('returns unparseable values unchanged', () => {
    expect(formatTemporal('not a date')).toBe('not a date');
  });
});
