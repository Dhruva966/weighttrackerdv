import { describe, expect, it } from 'vitest';
import { estimateOneRepMax, isPersonalRecord } from './pr';

describe('isPersonalRecord', () => {
  it('marks the first non-warmup set as a PR', () => {
    expect(isPersonalRecord({ weightLb: 65, reps: 10 }, [])).toBe(true);
  });

  it('requires a heavier weight or the same weight with more reps', () => {
    const history = [
      { weightLb: 65, reps: 10, isWarmup: false },
      { weightLb: 70, reps: 8, isWarmup: false },
    ];

    expect(isPersonalRecord({ weightLb: 70, reps: 8 }, history)).toBe(false);
    expect(isPersonalRecord({ weightLb: 70, reps: 9 }, history)).toBe(true);
    expect(isPersonalRecord({ weightLb: 75, reps: 5 }, history)).toBe(true);
  });

  it('excludes warmups from both candidate and history comparison', () => {
    const history = [{ weightLb: 100, reps: 10, isWarmup: true }];

    expect(isPersonalRecord({ weightLb: 95, reps: 10 }, history)).toBe(true);
    expect(isPersonalRecord({ weightLb: 135, reps: 3, isWarmup: true }, history)).toBe(false);
  });
});

describe('estimateOneRepMax', () => {
  it('uses the Epley formula and rounds to one decimal place', () => {
    expect(estimateOneRepMax(100, 10)).toBe(133.3);
  });
});
