import { describe, expect, it } from 'vitest';
import { buildSyntheticProgressRows } from './syntheticProgress';

describe('buildSyntheticProgressRows', () => {
  it('uses explicit grade progression when provided', () => {
    expect(
      buildSyntheticProgressRows({
        slug: 'bicep-curl',
        currentWeightLb: 45,
        progression: [25, 30, 35, 45],
      }).map((row) => row.weightLb),
    ).toEqual([25, 30, 35, 45]);
  });

  it('creates deterministic increasing synthetic history for a lift without explicit progression', () => {
    const first = buildSyntheticProgressRows({ slug: 'lat-pulldown', currentWeightLb: 175 });
    const second = buildSyntheticProgressRows({ slug: 'lat-pulldown', currentWeightLb: 175 });

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first[0].weightLb).toBeLessThan(first[3].weightLb);
    expect(first[3].weightLb).toBe(175);
  });

  it('keeps current multi-set rows as the final current grade point', () => {
    expect(
      buildSyntheticProgressRows({
        slug: 'bench-press',
        currentWeightLb: 205,
        currentReps: 3,
      }).at(-1),
    ).toMatchObject({ grade: 'Current', weightLb: 205, reps: 3 });
  });
});
