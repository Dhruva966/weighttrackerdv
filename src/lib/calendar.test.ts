import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  buildSessionDayMap,
  calendarDayToStartedAt,
  findDaySession,
  formatMonthLabel,
  getDayWorkoutBundle,
  shiftMonth,
  summarizeDayWorkout,
  summarizeMonth,
  toDayKey,
} from './calendar';

describe('buildSessionDayMap', () => {
  it('marks gym days from any session (open or ended) and tracks overload from sets', () => {
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
        { sessionId: 's3', isPr: false },
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
    expect(activityByDay.get('2026-07-13')).toMatchObject({
      hadGymVisit: true,
      setCount: 1,
      sessionIds: ['s3'],
    });
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

describe('getDayWorkoutBundle', () => {
  const sessions = [
    {
      id: 's1',
      startedAt: '2026-07-10T18:00:00-07:00',
      endedAt: '2026-07-10T19:00:00-07:00',
      notes: 'Bench focus',
    },
    {
      id: 's2',
      startedAt: '2026-07-10T20:00:00-07:00',
      endedAt: '2026-07-10T21:00:00-07:00',
    },
    {
      id: 's-open',
      startedAt: '2026-07-11T18:00:00-07:00',
    },
  ];

  const sets = [
    {
      id: 'set-1',
      sessionId: 's1',
      exerciseId: 'ex-1',
      setNumber: 1,
      weightLb: 135,
      reps: 8,
      isWarmup: false,
      isPr: true,
      createdAt: '2026-07-10T18:05:00-07:00',
    },
    {
      id: 'set-2',
      sessionId: 's1',
      exerciseId: 'ex-1',
      setNumber: 2,
      weightLb: 95,
      reps: 10,
      isWarmup: true,
      isPr: false,
      createdAt: '2026-07-10T18:10:00-07:00',
    },
    {
      id: 'set-3',
      sessionId: 's2',
      exerciseId: 'ex-2',
      setNumber: 1,
      weightLb: 50,
      reps: 12,
      isWarmup: false,
      isPr: false,
      createdAt: '2026-07-10T20:05:00-07:00',
    },
    {
      id: 'set-open',
      sessionId: 's-open',
      exerciseId: 'ex-1',
      setNumber: 1,
      weightLb: 100,
      reps: 5,
      isWarmup: false,
      isPr: false,
      createdAt: '2026-07-11T18:05:00-07:00',
    },
  ];

  it('returns sessions for a day with volume and PR counts', () => {
    const bundle = getDayWorkoutBundle('2026-07-10', sessions, sets, {
      timeZone: 'America/Los_Angeles',
    });

    expect(bundle.date).toBe('2026-07-10');
    expect(bundle.activity).toMatchObject({
      hadGymVisit: true,
      hadProgressiveOverload: true,
      prCount: 1,
      setCount: 3,
    });
    expect(bundle.sessions).toHaveLength(2);
    expect(bundle.sessions[0]?.session.id).toBe('s2');
    expect(bundle.sessions[1]).toMatchObject({
      session: { id: 's1', notes: 'Bench focus' },
      prCount: 1,
      volume: 1080,
    });
    expect(bundle.sessions[1]?.sets).toHaveLength(2);
  });

  it('includes open sessions for a day (no endedAt required)', () => {
    const bundle = getDayWorkoutBundle('2026-07-11', sessions, sets, {
      timeZone: 'America/Los_Angeles',
    });

    expect(bundle.sessions).toHaveLength(1);
    expect(bundle.sessions[0]?.session.id).toBe('s-open');
    expect(bundle.activity).toMatchObject({
      hadGymVisit: true,
      setCount: 1,
      sessionIds: ['s-open'],
    });
  });

  it('keys the same late-night session into a different day for a non-LA device timezone', () => {
    // 2026-07-12T06:30:00.000Z is still Jul 11 in LA (UTC-7) but already Jul 12 in Kolkata (UTC+5:30).
    const lateSessions = [
      { id: 'late', startedAt: '2026-07-12T06:30:00.000Z', endedAt: '2026-07-12T07:30:00.000Z' },
    ];
    const lateSets = [
      {
        id: 'late-set',
        sessionId: 'late',
        exerciseId: 'ex-1',
        setNumber: 1,
        weightLb: 135,
        reps: 8,
        isWarmup: false,
        isPr: false,
        createdAt: '2026-07-12T06:40:00.000Z',
      },
    ];

    const laBundle = getDayWorkoutBundle('2026-07-11', lateSessions, lateSets, {
      timeZone: 'America/Los_Angeles',
    });
    expect(laBundle.sessions).toHaveLength(1);

    const kolkataBundleSameDate = getDayWorkoutBundle('2026-07-11', lateSessions, lateSets, {
      timeZone: 'Asia/Kolkata',
    });
    expect(kolkataBundleSameDate.sessions).toHaveLength(0);

    const kolkataBundleNextDate = getDayWorkoutBundle('2026-07-12', lateSessions, lateSets, {
      timeZone: 'Asia/Kolkata',
    });
    expect(kolkataBundleNextDate.sessions).toHaveLength(1);
  });
});

describe('calendarDayToStartedAt', () => {
  it('uses now when the day key is today in LA', () => {
    const now = new Date('2026-07-18T20:15:00.000Z');
    const todayKey = toDayKey(now, 'America/Los_Angeles');
    expect(calendarDayToStartedAt(todayKey, 'America/Los_Angeles', now)).toBe(now.toISOString());
  });

  it('anchors past days near local noon in LA', () => {
    const startedAt = calendarDayToStartedAt('2026-07-10', 'America/Los_Angeles', new Date('2026-07-18T20:00:00Z'));
    expect(toDayKey(startedAt, 'America/Los_Angeles')).toBe('2026-07-10');
  });

  it('round-trips correctly for a non-LA device timezone (Asia/Kolkata)', () => {
    const now = new Date('2026-07-18T05:15:00.000Z');
    const todayKey = toDayKey(now, 'Asia/Kolkata');
    expect(calendarDayToStartedAt(todayKey, 'Asia/Kolkata', now)).toBe(now.toISOString());

    const startedAt = calendarDayToStartedAt('2026-07-10', 'Asia/Kolkata', new Date('2026-07-18T20:00:00Z'));
    expect(toDayKey(startedAt, 'Asia/Kolkata')).toBe('2026-07-10');
  });

  it('anchors correctly for America/New_York, a common non-LA US timezone', () => {
    const startedAt = calendarDayToStartedAt(
      '2026-07-10',
      'America/New_York',
      new Date('2026-07-18T20:00:00Z'),
    );
    expect(toDayKey(startedAt, 'America/New_York')).toBe('2026-07-10');
  });

  it('anchors correctly for a calendar day that itself crosses the March 2026 DST transition', () => {
    // 2026-03-08 is the spring-forward day (02:00 PST -> 03:00 PDT).
    const startedAt = calendarDayToStartedAt(
      '2026-03-08',
      'America/Los_Angeles',
      new Date('2026-03-18T20:00:00Z'),
    );
    expect(toDayKey(startedAt, 'America/Los_Angeles')).toBe('2026-03-08');
  });

  it('anchors correctly for a calendar day that itself crosses the November 2026 DST transition', () => {
    // 2026-11-01 is the fall-back day (02:00 PDT -> 01:00 PST).
    const startedAt = calendarDayToStartedAt(
      '2026-11-01',
      'America/Los_Angeles',
      new Date('2026-11-18T20:00:00Z'),
    );
    expect(toDayKey(startedAt, 'America/Los_Angeles')).toBe('2026-11-01');
  });

  it('round-trips east-of-UTC zones (Grow Log workout path — was off-by-one on fixed UTC hours)', () => {
    const now = new Date('2026-08-04T10:00:00.000Z');
    for (const timeZone of [
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Kiritimati',
    ]) {
      const startedAt = calendarDayToStartedAt('2026-08-03', timeZone, now);
      expect(toDayKey(startedAt, timeZone)).toBe('2026-08-03');
    }
  });
});

describe('toDayKey with a non-LA device timezone', () => {
  it('buckets the same instant into a different calendar day than America/Los_Angeles', () => {
    const instant = new Date('2026-07-17T19:00:00Z');
    expect(toDayKey(instant, 'America/Los_Angeles')).toBe('2026-07-17');
    expect(toDayKey(instant, 'Asia/Kolkata')).toBe('2026-07-18');
  });
});

describe('summarizeDayWorkout', () => {
  const sessions = [
    {
      id: 's1',
      startedAt: '2026-07-10T18:00:00-07:00',
      endedAt: '2026-07-10T19:00:00-07:00',
      notes: 'Bench focus',
    },
    {
      id: 's2',
      startedAt: '2026-07-10T20:00:00-07:00',
      endedAt: '2026-07-10T21:00:00-07:00',
    },
    {
      id: 's-open',
      startedAt: '2026-07-11T18:00:00-07:00',
      notes: 'Still going',
    },
    {
      id: 's-open-late',
      startedAt: '2026-07-11T20:00:00-07:00',
    },
  ];

  const sets = [
    {
      id: 'set-1',
      sessionId: 's1',
      exerciseId: 'ex-chest',
      setNumber: 1,
      weightLb: 135,
      reps: 8,
      isWarmup: false,
      isPr: true,
      createdAt: '2026-07-10T18:05:00-07:00',
    },
    {
      id: 'set-3',
      sessionId: 's2',
      exerciseId: 'ex-tri',
      setNumber: 1,
      weightLb: 50,
      reps: 12,
      isWarmup: false,
      isPr: false,
      createdAt: '2026-07-10T20:05:00-07:00',
    },
    {
      id: 'set-open',
      sessionId: 's-open',
      exerciseId: 'ex-back',
      setNumber: 1,
      weightLb: 100,
      reps: 5,
      isWarmup: false,
      isPr: false,
      createdAt: '2026-07-11T18:05:00-07:00',
    },
  ];

  const exercises = [
    { id: 'ex-chest', muscleGroup: 'chest' },
    { id: 'ex-tri', muscleGroup: 'triceps' },
    { id: 'ex-back', muscleGroup: 'back' },
  ];

  it('rolls multiple completed sessions into one day summary with muscle groups', () => {
    const summary = summarizeDayWorkout('2026-07-10', sessions, sets, exercises, {
      timeZone: 'America/Los_Angeles',
    });

    expect(summary).toMatchObject({
      date: '2026-07-10',
      primarySessionId: 's1',
      inProgress: false,
      notes: 'Bench focus',
      muscleGroups: ['chest', 'triceps'],
    });
  });

  it('prefers the earliest in-progress session as the day entry point', () => {
    const summary = summarizeDayWorkout('2026-07-11', sessions, sets, exercises, {
      timeZone: 'America/Los_Angeles',
    });

    expect(summary).toMatchObject({
      primarySessionId: 's-open',
      inProgress: true,
      muscleGroups: ['back'],
    });
  });

  it('returns null when the day has no sessions', () => {
    expect(
      summarizeDayWorkout('2026-07-12', sessions, sets, exercises, {
        timeZone: 'America/Los_Angeles',
      }),
    ).toBeNull();
  });
});

describe('findDaySession', () => {
  it('returns in-progress session before completed ones', () => {
    const found = findDaySession(
      '2026-07-18',
      [
        {
          id: 'done',
          startedAt: '2026-07-18T10:00:00-07:00',
          endedAt: '2026-07-18T11:00:00-07:00',
        },
        {
          id: 'open',
          startedAt: '2026-07-18T14:00:00-07:00',
        },
      ],
      { timeZone: 'America/Los_Angeles' },
    );
    expect(found?.id).toBe('open');
  });

  it('returns earliest completed session when none are open', () => {
    const found = findDaySession(
      '2026-07-18',
      [
        {
          id: 'later',
          startedAt: '2026-07-18T16:00:00-07:00',
          endedAt: '2026-07-18T17:00:00-07:00',
        },
        {
          id: 'earlier',
          startedAt: '2026-07-18T10:00:00-07:00',
          endedAt: '2026-07-18T11:00:00-07:00',
        },
      ],
      { timeZone: 'America/Los_Angeles' },
    );
    expect(found?.id).toBe('earlier');
  });

  it('keeps a localDate-stamped Aug 3 workout on Aug 3 even when startedAt is UTC midnight (LA viewer)', () => {
    const sessions = [
      {
        id: 'arms',
        startedAt: '2026-08-03T00:00:00.000Z',
        localDate: '2026-08-03',
        timezone: 'Asia/Kolkata',
        notes: 'Arms, Biceps, Core',
      },
    ];
    const sets = [
      {
        id: 'set-1',
        sessionId: 'arms',
        exerciseId: 'ex-arms',
        setNumber: 1,
        weightLb: 40,
        reps: 12,
        isPr: false,
        createdAt: '2026-08-03T01:00:00.000Z',
      },
    ];
    const exercises = [{ id: 'ex-arms', muscleGroup: 'arms' }];

    // Without localDate preference, toDayKey(startedAt) in LA would be Aug 2.
    expect(toDayKey(sessions[0]!.startedAt, 'America/Los_Angeles')).toBe('2026-08-02');

    expect(
      summarizeDayWorkout('2026-08-03', sessions, sets, exercises, {
        timeZone: 'America/Los_Angeles',
      }),
    ).toMatchObject({
      date: '2026-08-03',
      primarySessionId: 'arms',
      muscleGroups: ['arms'],
    });
    expect(
      summarizeDayWorkout('2026-08-02', sessions, sets, exercises, {
        timeZone: 'America/Los_Angeles',
      }),
    ).toBeNull();
    expect(
      findDaySession('2026-08-03', sessions, { timeZone: 'America/Los_Angeles' })?.id,
    ).toBe('arms');
  });
});
