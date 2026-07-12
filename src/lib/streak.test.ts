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
});
