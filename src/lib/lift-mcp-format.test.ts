import { describe, expect, it } from 'vitest';
import {
  clampLimit,
  estimateOneRepMaxLb,
  isLiftWorkingSet,
  rankExerciseMatches,
  setVolumeLb,
  slugifyExerciseQuery,
} from './lift-mcp-format';

describe('lift-mcp-format', () => {
  it('slugifies exercise queries', () => {
    expect(slugifyExerciseQuery('Bench Press (Barbell)')).toBe('bench-press-barbell');
    expect(slugifyExerciseQuery('  Squats!!  ')).toBe('squats');
  });

  it('estimates 1RM like pr.ts', () => {
    expect(estimateOneRepMaxLb(225, 5)).toBe(262.5);
    expect(estimateOneRepMaxLb(0, 5)).toBe(0);
  });

  it('computes volume and working-set gates', () => {
    expect(setVolumeLb(135, 8)).toBe(1080);
    expect(setVolumeLb(null, 8)).toBe(0);
    expect(isLiftWorkingSet({ is_warmup: true, weight_lb: 135, reps: 5 })).toBe(false);
    expect(isLiftWorkingSet({ is_warmup: false, weight_lb: 135, reps: 5 })).toBe(true);
    expect(isLiftWorkingSet({ is_warmup: false, weight_lb: null, reps: null })).toBe(false);
  });

  it('clamps limits', () => {
    expect(clampLimit(undefined, 20, 100)).toBe(20);
    expect(clampLimit(0, 20, 100)).toBe(1);
    expect(clampLimit(500, 20, 100)).toBe(100);
  });

  it('ranks exercise matches preferring exact slug then name', () => {
    const pool = [
      { id: '1', slug: 'bench-press-dumbbell', name: 'Bench Press (Dumbbell)', archived: false },
      { id: '2', slug: 'bench-press-barbell', name: 'Bench Press (Barbell)', archived: false },
      { id: '3', slug: 'incline-bench-press-barbell', name: 'Incline Bench Press', archived: true },
    ];
    const ranked = rankExerciseMatches('bench-press-barbell', pool);
    expect(ranked[0]?.slug).toBe('bench-press-barbell');
    expect(rankExerciseMatches('bench press', pool)[0]?.slug).toMatch(/bench-press/);
    expect(rankExerciseMatches('', pool)).toEqual([]);
  });
});
