import { describe, expect, it } from 'vitest';
import { buildMonthGrid, buildSessionDayMap, formatMonthLabel, shiftMonth, summarizeMonth } from './calendar';

describe('buildSessionDayMap', () => {
  it('marks gym days and progressive overload days from completed sessions', () => {
    const activityByDay = buildSessionDayMap(
      [
        {
          id: 's1',
          startedAt: '2026-07-10T18:00:00-07:00',
          endedAt: '2026-07-10T19:00:00-07:00',
        },
        {
          id: 's2',
          startedAt: '2026-07-12T18:00:00-07:00',
          endedAt: '2026-07-12T19:00:00-07:00',
        },
        {
          id: 's3',
          startedAt: '2026-07-13T18:00:00-07:00',
        },
      ],
      [
        { sessionId: 's1', isPr: false },
        { sessionId: 's1', isPr: true },
        { sessionId: 's2', isPr: false },
      ],
      { timeZone: 'America/Los_Angeles' },
    );

    expect(activityByDay.get('2026-07-10')).toMatchObject({
      hadGymVisit: true,
      hadProgressiveOverload: true,
      setCount: 2,
      prCount: 1,
      sessionIds: ['s1'],
    });
    expect(activityByDay.get('2026-07-12')).toMatchObject({
      hadGymVisit: true,
      hadProgressiveOverload: false,
      setCount: 1,
      prCount: 0,
    });
    expect(activityByDay.has('2026-07-13')).toBe(false);
  });
});

describe('buildMonthGrid', () => {
  it('pads the month to full weeks and marks today', () => {
    const activityByDay = buildSessionDayMap(
      [
        {
          id: 's1',
          startedAt: '2026-07-10T18:00:00-07:00',
          endedAt: '2026-07-10T19:00:00-07:00',
        },
      ],
      [{ sessionId: 's1', isPr: true }],
      { timeZone: 'America/Los_Angeles' },
    );

    const cells = buildMonthGrid(2026, 7, activityByDay, {
      timeZone: 'America/Los_Angeles',
      today: '2026-07-13',
    });

    expect(cells.length % 7).toBe(0);
    expect(cells.find((cell) => cell.date === '2026-07-10')?.activity?.hadProgressiveOverload).toBe(true);
    expect(cells.find((cell) => cell.date === '2026-07-13')?.isToday).toBe(true);
  });
});

describe('calendar helpers', () => {
  it('formats and shifts months', () => {
    expect(formatMonthLabel(2026, 7)).toBe('July 2026');
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('summarizes gym and overload days for a month', () => {
    const activityByDay = buildSessionDayMap(
      [
        {
          id: 's1',
          startedAt: '2026-07-10T18:00:00-07:00',
          endedAt: '2026-07-10T19:00:00-07:00',
        },
        {
          id: 's2',
          startedAt: '2026-07-12T18:00:00-07:00',
          endedAt: '2026-07-12T19:00:00-07:00',
        },
      ],
      [
        { sessionId: 's1', isPr: true },
        { sessionId: 's2', isPr: false },
      ],
      { timeZone: 'America/Los_Angeles' },
    );

    expect(summarizeMonth(activityByDay, 2026, 7)).toEqual({
      gymDays: 2,
      overloadDays: 1,
      totalSets: 2,
    });
  });
});
