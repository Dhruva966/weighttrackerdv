import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dayKeyToUtcNoon,
  formatDayKeyLabel,
  getDeviceTimeZone,
  isDayKey,
  sessionDayKey,
  toDayKey,
} from './local-day';

describe('getDeviceTimeZone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the resolved Intl timezone', () => {
    expect(getDeviceTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('reflects whatever IANA zone Intl resolves to, not a hardcoded literal', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }),
        }) as unknown as Intl.DateTimeFormat,
    );

    expect(getDeviceTimeZone()).toBe('Asia/Kolkata');
    spy.mockRestore();
  });

  it('falls back to America/Los_Angeles when Intl throws', () => {
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl unavailable in this environment');
    });

    expect(getDeviceTimeZone()).toBe('America/Los_Angeles');
    spy.mockRestore();
  });
});

describe('toDayKey', () => {
  it('passes bare YYYY-MM-DD through without UTC midnight reinterpretation', () => {
    expect(toDayKey('2026-08-03', 'America/Los_Angeles')).toBe('2026-08-03');
    expect(toDayKey('2026-08-03', 'Asia/Kolkata')).toBe('2026-08-03');
  });

  it('does not shift UTC midnight of a day key in America/Los_Angeles when given a bare key', () => {
    // Classic trap: new Date('2026-08-03') is UTC midnight → Aug 2 in LA.
    expect(toDayKey(new Date('2026-08-03T00:00:00.000Z'), 'America/Los_Angeles')).toBe('2026-08-02');
    expect(toDayKey('2026-08-03', 'America/Los_Angeles')).toBe('2026-08-03');
  });

  it('buckets late-evening IST correctly near midnight boundaries', () => {
    // 11:30pm IST on Aug 3 = 18:00 UTC Aug 3
    expect(toDayKey('2026-08-03T18:00:00.000Z', 'Asia/Kolkata')).toBe('2026-08-03');
    // 12:30am IST on Aug 4 = 19:00 UTC Aug 3
    expect(toDayKey('2026-08-03T19:00:00.000Z', 'Asia/Kolkata')).toBe('2026-08-04');
  });
});

describe('formatDayKeyLabel', () => {
  it('formats Aug 3 as August 3 (not August 2) for every common device offset', () => {
    expect(formatDayKeyLabel('2026-08-03')).toBe('Monday, August 3');
  });

  it('avoids the local-midnight + UTC-format off-by-one east of UTC', () => {
    // Trap: new Date(y, m-1, d) or T00:00:00 local + timeZone UTC → previous day east of UTC.
    const localMidnight = new Date(2026, 7, 3);
    const buggy = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(localMidnight);
    if (localMidnight.getTimezoneOffset() < 0) {
      // Positive UTC offsets (IST, HKT, …): local midnight is still the previous UTC day.
      expect(buggy).toBe('Sunday, August 2');
    }
    expect(formatDayKeyLabel('2026-08-03')).toBe('Monday, August 3');
  });

  it('avoids the date-only parse + local-format off-by-one in US zones', () => {
    const utcMidnight = new Date('2026-08-03');
    const laLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Los_Angeles',
    }).format(utcMidnight);
    expect(laLabel).toBe('Sunday, August 2');
    expect(formatDayKeyLabel('2026-08-03')).toBe('Monday, August 3');
  });
});

describe('sessionDayKey', () => {
  it('prefers stamped localDate over startedAt timezone reinterpretation', () => {
    // UTC midnight Aug 3 is Aug 2 in LA — without localDate the calendar would slip.
    expect(
      sessionDayKey(
        {
          startedAt: '2026-08-03T00:00:00.000Z',
          localDate: '2026-08-03',
          timezone: 'Asia/Kolkata',
        },
        'America/Los_Angeles',
      ),
    ).toBe('2026-08-03');
  });

  it('falls back to startedAt in the session timezone when localDate is missing', () => {
    expect(
      sessionDayKey(
        {
          startedAt: '2026-08-03T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
        },
        'America/Los_Angeles',
      ),
    ).toBe('2026-08-03');
  });

  it('falls back to the viewer timezone when neither localDate nor session timezone exist', () => {
    expect(
      sessionDayKey(
        {
          startedAt: '2026-08-03T00:00:00.000Z',
        },
        'America/Los_Angeles',
      ),
    ).toBe('2026-08-02');
  });
});

describe('dayKey helpers', () => {
  it('validates and anchors day keys at UTC noon', () => {
    expect(isDayKey('2026-08-03')).toBe(true);
    expect(isDayKey('2026-8-3')).toBe(false);
    expect(dayKeyToUtcNoon('2026-08-03').toISOString()).toBe('2026-08-03T12:00:00.000Z');
  });
});
