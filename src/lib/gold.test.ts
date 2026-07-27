import { describe, expect, it } from 'vitest';
import {
  GOLD_CAP,
  calculateGoldDays,
  collectConsistencyDays,
  goldVisualStage,
  toGoldDayKey,
} from './gold';

describe('collectConsistencyDays', () => {
  it('unions weigh-ins, movements, and gym days without duplicates (explicit America/Los_Angeles)', () => {
    expect(
      collectConsistencyDays(
        {
          weighInDays: ['2026-07-16', '2026-07-17'],
          movementAts: ['2026-07-17T18:00:00-07:00', '2026-07-18T09:00:00-07:00'],
          gymSessionStarts: ['2026-07-18T12:00:00-07:00'],
        },
        'America/Los_Angeles',
      ),
    ).toEqual(['2026-07-16', '2026-07-17', '2026-07-18']);
  });

  it('unions the same instants into different calendar days for a non-LA device timezone', () => {
    // Same instants as above, but bucketed in Asia/Kolkata (UTC+5:30, no DST) instead of
    // America/Los_Angeles (UTC-7 in July) — the day boundaries genuinely shift.
    expect(
      collectConsistencyDays(
        {
          weighInDays: ['2026-07-16', '2026-07-17'],
          movementAts: ['2026-07-17T18:00:00-07:00', '2026-07-18T09:00:00-07:00'],
          gymSessionStarts: ['2026-07-18T12:00:00-07:00'],
        },
        'Asia/Kolkata',
      ),
    ).toEqual(['2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19']);
  });
});

describe('toGoldDayKey with a non-LA device timezone', () => {
  it('buckets the same instant into a different calendar day than America/Los_Angeles', () => {
    const instant = '2026-07-17T19:00:00Z';
    expect(toGoldDayKey(instant, 'America/Los_Angeles')).toBe('2026-07-17');
    expect(toGoldDayKey(instant, 'Asia/Kolkata')).toBe('2026-07-18');
    expect(toGoldDayKey(instant, 'America/New_York')).toBe('2026-07-17');
  });
});

describe('calculateGoldDays', () => {
  it('returns 0 when there is no recent activity', () => {
    expect(
      calculateGoldDays(['2026-07-01'], {
        today: '2026-07-18',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(
      calculateGoldDays(['2026-07-16', '2026-07-17', '2026-07-18'], {
        today: '2026-07-18',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe(3);
  });

  it('keeps the streak alive when today is empty but yesterday has activity', () => {
    expect(
      calculateGoldDays(['2026-07-16', '2026-07-17'], {
        today: '2026-07-18',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe(2);
  });

  it('breaks when there is a gap before yesterday', () => {
    expect(
      calculateGoldDays(['2026-07-14', '2026-07-17'], {
        today: '2026-07-18',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe(1);
  });

  it('caps at GOLD_CAP', () => {
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 5, 20));
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    });
    expect(
      calculateGoldDays(days, {
        today: days[days.length - 1],
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe(GOLD_CAP);
  });
});

describe('calculateGoldDays with a non-LA device timezone', () => {
  it('computes a correct 3-day streak for America/New_York from raw ISO timestamps', () => {
    // Each instant is 11:30pm local in New York (EDT, UTC-4 in July) on consecutive days.
    const consistencyDays = [
      '2026-07-17T03:30:00Z', // 2026-07-16 23:30 EDT
      '2026-07-18T03:30:00Z', // 2026-07-17 23:30 EDT
      '2026-07-19T03:30:00Z', // 2026-07-18 23:30 EDT
    ];
    expect(
      calculateGoldDays(consistencyDays, { today: '2026-07-18', timeZone: 'America/New_York' }),
    ).toBe(3);
  });

  it('computes a correct 3-day streak for Asia/Kolkata from raw ISO timestamps', () => {
    // Each instant is just after midnight local in Kolkata (UTC+5:30, no DST).
    const consistencyDays = [
      '2026-07-16T19:00:00Z', // 2026-07-17 00:30 IST
      '2026-07-17T19:00:00Z', // 2026-07-18 00:30 IST
      '2026-07-18T19:00:00Z', // 2026-07-19 00:30 IST
    ];
    expect(
      calculateGoldDays(consistencyDays, { today: '2026-07-19', timeZone: 'Asia/Kolkata' }),
    ).toBe(3);
  });
});

describe('calculateGoldDays across US DST transitions (America/Los_Angeles)', () => {
  it('keeps day-bucketing and streak math correct across the March 2026 spring-forward transition', () => {
    // Spring forward: 2026-03-08 02:00 PST -> 03:00 PDT (clocks skip forward; offset -08:00 -> -07:00).
    const consistencyDays = [
      '2026-03-07T23:00:00-08:00', // Mar 7, 11pm PST (pre-transition)
      '2026-03-08T12:00:00-07:00', // Mar 8, noon PDT (post-transition)
      '2026-03-09T00:30:00-07:00', // Mar 9, 12:30am PDT
    ];

    const dayKeys = consistencyDays.map((iso) => toGoldDayKey(iso, 'America/Los_Angeles'));
    expect(dayKeys).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);

    expect(
      calculateGoldDays(consistencyDays, { today: '2026-03-09', timeZone: 'America/Los_Angeles' }),
    ).toBe(3);
  });

  it('keeps day-bucketing and streak math correct across the November 2026 fall-back transition', () => {
    // Fall back: 2026-11-01 02:00 PDT -> 01:00 PST (clocks repeat an hour; offset -07:00 -> -08:00).
    const consistencyDays = [
      '2026-10-31T23:00:00-07:00', // Oct 31, 11pm PDT (pre-transition)
      '2026-11-01T12:00:00-08:00', // Nov 1, noon PST (post-transition)
      '2026-11-02T00:30:00-08:00', // Nov 2, 12:30am PST
    ];

    const dayKeys = consistencyDays.map((iso) => toGoldDayKey(iso, 'America/Los_Angeles'));
    expect(dayKeys).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);

    expect(
      calculateGoldDays(consistencyDays, { today: '2026-11-02', timeZone: 'America/Los_Angeles' }),
    ).toBe(3);
  });
});

describe('goldVisualStage', () => {
  it('clamps to 0–21', () => {
    expect(goldVisualStage(-2)).toBe(0);
    expect(goldVisualStage(1.9)).toBe(1);
    expect(goldVisualStage(99)).toBe(21);
  });
});
