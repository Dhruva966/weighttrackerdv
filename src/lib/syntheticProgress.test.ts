import { describe, expect, it } from 'vitest';
import { buildJaggedSyntheticLiftSeries, buildSyntheticProgressRows, JAGGED_POINT_COUNT } from './syntheticProgress';

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

describe('buildJaggedSyntheticLiftSeries', () => {
  it('creates a long synthetic timeline with many jagged points', () => {
    const series = buildJaggedSyntheticLiftSeries({ slug: 'lat-pulldown', currentWeightLb: 175, currentReps: 6 });

    expect(series).toHaveLength(JAGGED_POINT_COUNT);
    expect(series[0].label).toMatch(/Sep/i);
    expect(series.at(-1)?.weightLb).toBe(175);
    expect(series.at(-1)?.reps).toBe(6);
    expect(new Date(series[0].date).getFullYear()).toBe(2022);
    expect(new Date(series.at(-1)!.date).getFullYear()).toBe(2026);
  });

  it('is deterministic and not perfectly monotonic', () => {
    const first = buildJaggedSyntheticLiftSeries({ slug: 'bench-press', currentWeightLb: 205, currentReps: 3 });
    const second = buildJaggedSyntheticLiftSeries({ slug: 'bench-press', currentWeightLb: 205, currentReps: 3 });
    const dips = first.filter((point, index) => index > 0 && point.weightLb < first[index - 1].weightLb);

    expect(first).toEqual(second);
    expect(dips.length).toBeGreaterThan(3);
  });
});
