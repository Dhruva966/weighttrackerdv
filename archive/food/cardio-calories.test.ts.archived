import { describe, expect, it } from 'vitest';
import { estimateCardioCalories, metForMovementKind } from './cardio-calories';

describe('estimateCardioCalories', () => {
  it('estimates stairmaster calories from MET × weight × duration', () => {
    // 9.0 MET × 3.5 × (169/2.2046226218) × 10 / 200 ≈ 121
    expect(
      estimateCardioCalories({
        kind: 'stairmaster',
        durationMin: 10,
        bodyWeightLb: 169,
      }),
    ).toBe(121);
  });

  it('uses a lower MET for flat walks than incline walks', () => {
    const walk = estimateCardioCalories({
      kind: 'walk',
      durationMin: 30,
      bodyWeightLb: 169,
    });
    const incline = estimateCardioCalories({
      kind: 'incline_walk',
      durationMin: 30,
      bodyWeightLb: 169,
    });
    expect(walk).not.toBeNull();
    expect(incline).not.toBeNull();
    expect(incline!).toBeGreaterThan(walk!);
  });

  it('returns null without duration or body weight', () => {
    expect(
      estimateCardioCalories({ kind: 'run', durationMin: null, bodyWeightLb: 169 }),
    ).toBeNull();
    expect(
      estimateCardioCalories({ kind: 'run', durationMin: 20, bodyWeightLb: null }),
    ).toBeNull();
  });

  it('exposes fixed METs for known kinds', () => {
    expect(metForMovementKind('stairmaster')).toBe(9);
    expect(metForMovementKind('walk')).toBe(3.5);
  });
});
