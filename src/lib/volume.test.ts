import { describe, expect, it } from 'vitest';
import { summarizeWeeklyVolume } from './volume';

describe('summarizeWeeklyVolume', () => {
  it('sums weight times reps for sets inside the week and groups by muscle', () => {
    const summary = summarizeWeeklyVolume(
      [
        { createdAt: '2026-07-07T12:00:00Z', weightLb: 100, reps: 10, muscleGroup: 'chest' },
        { createdAt: '2026-07-08T12:00:00Z', weightLb: 80, reps: 12, muscleGroup: 'back' },
        { createdAt: '2026-07-01T12:00:00Z', weightLb: 500, reps: 10, muscleGroup: 'legs' },
      ],
      { weekStartsOn: '2026-07-06' },
    );

    expect(summary.totalVolume).toBe(1960);
    expect(summary.byMuscle).toEqual({ chest: 1000, back: 960 });
  });

  it('calculates percentage share for each active muscle group', () => {
    const summary = summarizeWeeklyVolume(
      [
        { createdAt: '2026-07-07T12:00:00Z', weightLb: 100, reps: 10, muscleGroup: 'chest' },
        { createdAt: '2026-07-08T12:00:00Z', weightLb: 100, reps: 30, muscleGroup: 'legs' },
      ],
      { weekStartsOn: '2026-07-06' },
    );

    expect(summary.percentByMuscle).toEqual({ chest: 25, legs: 75 });
  });
});
