import { describe, expect, it } from 'vitest';
import {
  clampLimit,
  estimateOneRepMaxLb,
  normalizeBodyWeightLb,
  formatResolveCandidates,
  isLiftWorkingSet,
  rankExerciseMatches,
  resolveExerciseStatus,
  scoreExerciseMatches,
  setVolumeLb,
  slugifyExerciseQuery,
  todayKeyInTimeZone,
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

  it('normalizes body weight lbs', () => {
    expect(normalizeBodyWeightLb(169.456)).toBe(169.46);
    expect(normalizeBodyWeightLb(49.9)).toBeNull();
    expect(normalizeBodyWeightLb(500.01)).toBeNull();
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

  it('resolves exact vs ambiguous for Claude numbered picks', () => {
    const pool = [
      { id: '1', slug: 'bench-press-dumbbell', name: 'Bench Press (Dumbbell)', archived: false },
      { id: '2', slug: 'bench-press-barbell', name: 'Bench Press (Barbell)', archived: false },
      { id: '3', slug: 'cable-curl', name: 'Cable Curl', archived: false },
    ];
    const exact = formatResolveCandidates('bench-press-barbell', scoreExerciseMatches('bench-press-barbell', pool));
    expect(exact.status).toBe('exact');
    expect(exact.candidates).toHaveLength(1);
    expect(exact.candidates[0]?.n).toBe(1);

    const ambiguous = formatResolveCandidates('bench', scoreExerciseMatches('bench', pool));
    expect(ambiguous.status).toBe('ambiguous');
    expect(ambiguous.candidates.length).toBeGreaterThan(1);
    expect(ambiguous.candidates[0]?.n).toBe(1);
    expect(ambiguous.candidates[1]?.n).toBe(2);

    expect(formatResolveCandidates('zzz', scoreExerciseMatches('zzz', pool)).status).toBe('none');
    expect(resolveExerciseStatus([]).status).toBe('none');
  });

  it('formats today key in a timezone', () => {
    const key = todayKeyInTimeZone('America/Los_Angeles', new Date('2026-08-07T20:00:00Z'));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
