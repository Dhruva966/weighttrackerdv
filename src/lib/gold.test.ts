import { describe, expect, it } from 'vitest';
import {
  GOLD_CAP,
  calculateGoldDays,
  collectConsistencyDays,
  goldVisualStage,
} from './gold';

describe('collectConsistencyDays', () => {
  it('unions weigh-ins, movements, and gym days without duplicates', () => {
    expect(
      collectConsistencyDays({
        weighInDays: ['2026-07-16', '2026-07-17'],
        movementAts: ['2026-07-17T18:00:00-07:00', '2026-07-18T09:00:00-07:00'],
        gymSessionStarts: ['2026-07-18T12:00:00-07:00'],
      }),
    ).toEqual(['2026-07-16', '2026-07-17', '2026-07-18']);
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

describe('goldVisualStage', () => {
  it('clamps to 0–21', () => {
    expect(goldVisualStage(-2)).toBe(0);
    expect(goldVisualStage(1.9)).toBe(1);
    expect(goldVisualStage(99)).toBe(21);
  });
});
