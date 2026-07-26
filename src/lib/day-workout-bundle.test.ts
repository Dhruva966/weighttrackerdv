import { describe, expect, it } from 'vitest';
import { getDayWorkoutBundle } from './day-workout-bundle';

const exercises = [
  { id: 'ex-bench', name: 'Bench Press' },
  { id: 'ex-curl', name: 'Bicep Curl' },
];

describe('getDayWorkoutBundle', () => {
  it('returns null for an empty day', () => {
    expect(
      getDayWorkoutBundle('2026-07-10', {
        sessions: [],
        sets: [],
        exercises,
        movements: [],
      }),
    ).toBeNull();
  });

  it('builds a gym-only day with set weight/reps for progressive overload', () => {
    const bundle = getDayWorkoutBundle('2026-07-10', {
      sessions: [
        {
          id: 's1',
          startedAt: '2026-07-10T18:00:00-07:00',
          endedAt: '2026-07-10T19:00:00-07:00',
          notes: 'Felt strong',
        },
      ],
      sets: [
        {
          id: 'set-1',
          sessionId: 's1',
          exerciseId: 'ex-bench',
          setNumber: 1,
          weightLb: 185,
          reps: 5,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-10T18:10:00-07:00',
        },
        {
          id: 'set-2',
          sessionId: 's1',
          exerciseId: 'ex-bench',
          setNumber: 2,
          weightLb: 185,
          reps: 5,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-10T18:15:00-07:00',
        },
      ],
      exercises,
    });

    expect(bundle).toMatchObject({
      date: '2026-07-10',
      flags: { hadGym: true, hadPr: false, hadCardio: false },
    });
    expect(bundle?.sessions).toHaveLength(1);
    expect(bundle?.sessions[0]).toMatchObject({
      id: 's1',
      notes: 'Felt strong',
      setCount: 2,
      prCount: 0,
      volumeLb: 185 * 5 * 2,
    });
    expect(bundle?.sessions[0]?.exercises[0]).toMatchObject({
      exerciseId: 'ex-bench',
      name: 'Bench Press',
      setCount: 2,
    });
    expect(bundle?.sessions[0]?.exercises[0]?.sets).toEqual([
      expect.objectContaining({ weightLb: 185, reps: 5, isPr: false }),
      expect.objectContaining({ weightLb: 185, reps: 5, isPr: false }),
    ]);
    expect(bundle?.movements).toEqual([]);
  });

  it('marks PR days and includes open sessions', () => {
    const bundle = getDayWorkoutBundle('2026-07-12', {
      sessions: [
        {
          id: 'open',
          startedAt: '2026-07-12T17:00:00-07:00',
        },
        {
          id: 'done',
          startedAt: '2026-07-12T18:00:00-07:00',
          endedAt: '2026-07-12T19:00:00-07:00',
        },
      ],
      sets: [
        {
          id: 'pr-set',
          sessionId: 'done',
          exerciseId: 'ex-curl',
          setNumber: 1,
          weightLb: 110,
          reps: 8,
          isWarmup: false,
          isPr: true,
          createdAt: '2026-07-12T18:20:00-07:00',
        },
        {
          id: 'open-set',
          sessionId: 'open',
          exerciseId: 'ex-curl',
          setNumber: 1,
          weightLb: 100,
          reps: 8,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-12T17:20:00-07:00',
        },
      ],
      exercises,
    });

    expect(bundle?.sessions.map((session) => session.id)).toEqual(['open', 'done']);
    expect(bundle?.flags).toEqual({ hadGym: true, hadPr: true, hadCardio: false });
    expect(bundle?.sessions[1]?.prCount).toBe(1);
  });

  it('keys the day with America/Los_Angeles across the UTC date boundary', () => {
    // 2026-07-11 23:30 PDT == 2026-07-12 06:30 UTC — still July 11 in LA.
    const bundle = getDayWorkoutBundle('2026-07-11', {
      sessions: [
        {
          id: 'late',
          startedAt: '2026-07-12T06:30:00.000Z',
          endedAt: '2026-07-12T07:30:00.000Z',
        },
      ],
      sets: [
        {
          id: 'late-set',
          sessionId: 'late',
          exerciseId: 'ex-bench',
          setNumber: 1,
          weightLb: 135,
          reps: 8,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-12T06:40:00.000Z',
        },
      ],
      exercises,
      movements: [
        {
          id: 'move-1',
          loggedAt: '2026-07-12T06:00:00.000Z',
          kind: 'stairmaster',
          title: 'Stairmaster',
          durationMin: 10,
          summary: 'level 10 · 10 min',
          raw: 'stairmaster level 10 for 10 min',
        },
      ],
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.date).toBe('2026-07-11');
    expect(bundle?.flags.hadGym).toBe(true);
    expect(bundle?.flags.hadCardio).toBe(true);
    expect(bundle?.movements[0]).toMatchObject({
      id: 'move-1',
      kind: 'stairmaster',
      durationMin: 10,
    });

    expect(
      getDayWorkoutBundle('2026-07-12', {
        sessions: [
          {
            id: 'late',
            startedAt: '2026-07-12T06:30:00.000Z',
            endedAt: '2026-07-12T07:30:00.000Z',
          },
        ],
        sets: [],
        exercises,
        movements: [
          {
            id: 'move-1',
            loggedAt: '2026-07-12T06:00:00.000Z',
            kind: 'stairmaster',
            title: 'Stairmaster',
            durationMin: 10,
            summary: 'level 10 · 10 min',
            raw: 'stairmaster level 10 for 10 min',
          },
        ],
      }),
    ).toBeNull();
  });

  it('returns cardio-only days without inventing gym sessions', () => {
    const bundle = getDayWorkoutBundle('2026-07-14', {
      sessions: [],
      sets: [],
      exercises,
      movements: [
        {
          id: 'm1',
          loggedAt: '2026-07-14T16:00:00-07:00',
          kind: 'incline_walk',
          title: 'Incline walk',
          durationMin: 20,
          summary: '20 min',
          raw: 'incline walk 20 min',
        },
      ],
    });

    expect(bundle?.flags).toEqual({ hadGym: false, hadPr: false, hadCardio: true });
    expect(bundle?.sessions).toEqual([]);
    expect(bundle?.movements).toHaveLength(1);
  });
});
