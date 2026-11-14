import { describe, expect, it } from 'vitest';
import { formatUtc, parseApiDate } from './format';

describe('API timestamps (the real backend omits the timezone)', () => {
  it('treats a timezone-less ISO string as UTC, not local time', () => {
    // Dev A's backend emits e.g. "2026-11-14T23:18:26.714730" with no offset
    expect(parseApiDate('2026-11-14T23:18:26.714730')?.toISOString()).toBe('2026-11-14T23:18:26.714Z');
    expect(formatUtc('2026-11-14T23:18:26.714730')).toBe('14 Nov, 23:18 UTC');
  });

  it('respects an explicit Z or offset', () => {
    expect(parseApiDate('2026-11-14T10:05:00Z')?.toISOString()).toBe('2026-11-14T10:05:00.000Z');
    expect(parseApiDate('2026-11-14T10:05:00+05:30')?.toISOString()).toBe('2026-11-14T04:35:00.000Z');
    expect(formatUtc('2026-11-14T10:05:00Z')).toBe('14 Nov, 10:05 UTC');
  });

  it('accepts a date with only a time part and fractional seconds', () => {
    expect(parseApiDate('2026-11-15T00:00:00')?.toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('returns null for garbage and the raw text from formatUtc (never "Invalid Date")', () => {
    expect(parseApiDate('not a date')).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(formatUtc('not a date')).toBe('not a date');
    expect(formatUtc('')).toBe('');
  });
});
