import { describe, expect, it } from 'vitest';
import type { LoggedSet, WorkoutSession } from '../types';
import { previousWorkoutLogPlaceholder } from './previousWorkoutPlaceholder';

function setItem(partial: Partial<LoggedSet> & Pick<LoggedSet, 'id' | 'sessionId' | 'exerciseId'>): LoggedSet {
  return {
    setNumber: 1,
    weightLb: 40,
    reps: 8,
    isWarmup: false,
    isPr: false,
    createdAt: '2026-07-20T12:00:00.000Z',
    ...partial,
  };
}

describe('previousWorkoutLogPlaceholder', () => {
  const sessions: Array<Pick<WorkoutSession, 'id' | 'startedAt'>> = [
    { id: 'older', startedAt: '2026-07-10T12:00:00.000Z' },
    { id: 'recent', startedAt: '2026-07-20T12:00:00.000Z' },
    { id: 'current', startedAt: '2026-07-30T12:00:00.000Z' },
  ];

  it('formats weight, reps, sets from the most recent prior session', () => {
    const sets = [
      setItem({ id: 'a1', sessionId: 'older', exerciseId: 'ex-1', weightLb: 30, reps: 10, setNumber: 1 }),
      setItem({ id: 'a2', sessionId: 'older', exerciseId: 'ex-1', weightLb: 30, reps: 10, setNumber: 2 }),
      setItem({
        id: 'b1',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 44,
        reps: 8,
        setNumber: 1,
        createdAt: '2026-07-20T12:01:00.000Z',
      }),
      setItem({
        id: 'b2',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 44,
        reps: 8,
        setNumber: 2,
        createdAt: '2026-07-20T12:02:00.000Z',
      }),
      setItem({
        id: 'b3',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 44,
        reps: 7,
        setNumber: 3,
        createdAt: '2026-07-20T12:03:00.000Z',
      }),
      setItem({
        id: 'c1',
        sessionId: 'current',
        exerciseId: 'ex-1',
        weightLb: 50,
        reps: 5,
        setNumber: 1,
        createdAt: '2026-07-30T12:01:00.000Z',
      }),
    ];

    expect(previousWorkoutLogPlaceholder(sets, sessions, 'ex-1', 'current')).toBe('44, 8, 3');
  });

  it('ignores warmups in the prior session', () => {
    const sets = [
      setItem({
        id: 'w1',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 20,
        reps: 12,
        isWarmup: true,
        setNumber: 1,
      }),
      setItem({
        id: 'w2',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 44,
        reps: 8,
        setNumber: 2,
        createdAt: '2026-07-20T12:02:00.000Z',
      }),
      setItem({
        id: 'w3',
        sessionId: 'recent',
        exerciseId: 'ex-1',
        weightLb: 44,
        reps: 8,
        setNumber: 3,
        createdAt: '2026-07-20T12:03:00.000Z',
      }),
    ];

    expect(previousWorkoutLogPlaceholder(sets, sessions, 'ex-1', 'current')).toBe('44, 8, 2');
  });

  it('returns empty when there is no prior working history', () => {
    expect(previousWorkoutLogPlaceholder([], sessions, 'ex-1', 'current')).toBe('');
    expect(
      previousWorkoutLogPlaceholder(
        [
          setItem({
            id: 'only-current',
            sessionId: 'current',
            exerciseId: 'ex-1',
            weightLb: 50,
            reps: 5,
          }),
        ],
        sessions,
        'ex-1',
        'current',
      ),
    ).toBe('');
  });
});
