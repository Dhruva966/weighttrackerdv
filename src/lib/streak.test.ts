import { describe, expect, it } from 'vitest';
import { calculateStreaks } from './streak';

describe('calculateStreaks', () => {
  it('counts consecutive workout days ending today', () => {
    expect(
      calculateStreaks(['2026-07-09T17:00:00Z', '2026-07-10T17:00:00Z', '2026-07-11T17:00:00Z'], {
        today: '2026-07-11',
        timeZone: 'America/Los_Angeles',
      }),
    ).toEqual({ current: 3, longest: 3 });
  });

  it('keeps longest streak when the current streak is broken', () => {
    expect(
      calculateStreaks(
        ['2026-07-01T17:00:00Z', '2026-07-02T17:00:00Z', '2026-07-03T17:00:00Z', '2026-07-10T17:00:00Z'],
        {
          today: '2026-07-11',
          timeZone: 'America/Los_Angeles',
        },
      ),
    ).toEqual({ current: 0, longest: 3 });
  });

  it('deduplicates multiple sessions on the same local day', () => {
    expect(
      calculateStreaks(['2026-07-10T16:00:00Z', '2026-07-10T20:00:00Z', '2026-07-11T17:00:00Z'], {
        today: '2026-07-11',
        timeZone: 'America/Los_Angeles',
      }),
    ).toEqual({ current: 2, longest: 2 });
  });

  it('computes a correct streak for a non-LA device timezone (Asia/Kolkata)', () => {
    // Each instant is just after midnight local in Kolkata (UTC+5:30, no DST).
    expect(
      calculateStreaks(
        ['2026-07-16T19:00:00Z', '2026-07-17T19:00:00Z', '2026-07-18T19:00:00Z'],
        { today: '2026-07-19', timeZone: 'Asia/Kolkata' },
      ),
    ).toEqual({ current: 3, longest: 3 });
  });

  it('keeps streak math correct across the March 2026 DST spring-forward transition', () => {
    // Spring forward: 2026-03-08 02:00 PST -> 03:00 PDT (offset -08:00 -> -07:00).
    expect(
      calculateStreaks(
        [
          '2026-03-07T23:00:00-08:00', // Mar 7, 11pm PST (pre-transition)
          '2026-03-08T12:00:00-07:00', // Mar 8, noon PDT (post-transition)
          '2026-03-09T00:30:00-07:00', // Mar 9, 12:30am PDT
        ],
        { today: '2026-03-09', timeZone: 'America/Los_Angeles' },
      ),
    ).toEqual({ current: 3, longest: 3 });
  });

  it('keeps streak math correct across the November 2026 DST fall-back transition', () => {
    // Fall back: 2026-11-01 02:00 PDT -> 01:00 PST (offset -07:00 -> -08:00).
    expect(
      calculateStreaks(
        [
          '2026-10-31T23:00:00-07:00', // Oct 31, 11pm PDT (pre-transition)
          '2026-11-01T12:00:00-08:00', // Nov 1, noon PST (post-transition)
          '2026-11-02T00:30:00-08:00', // Nov 2, 12:30am PST
        ],
        { today: '2026-11-02', timeZone: 'America/Los_Angeles' },
      ),
    ).toEqual({ current: 3, longest: 3 });
  });
});
