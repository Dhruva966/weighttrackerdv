import { formatChartMonth } from './fmt';
import { estimateOneRepMax } from './pr';

export type SyntheticProgressInput = {
  slug: string;
  currentWeightLb: number;
  currentReps?: number;
  progression?: number[];
};

export type SyntheticProgressRow = {
  grade: '9th' | '10th' | '11th' | 'Current';
  date: string;
  weightLb: number;
  reps: number;
};

export type SyntheticLiftChartPoint = {
  date: string;
  label: string;
  weightLb: number;
  reps: number;
  oneRm: number;
};

const gradeRows: Array<Pick<SyntheticProgressRow, 'grade' | 'date'>> = [
  { grade: '9th', date: '2022-09-01T12:00:00-07:00' },
  { grade: '10th', date: '2023-09-01T12:00:00-07:00' },
  { grade: '11th', date: '2024-09-01T12:00:00-07:00' },
  { grade: 'Current', date: '2026-07-11T12:00:00-07:00' },
];

const JAGGED_SERIES_START = new Date('2022-09-01T12:00:00-07:00');
const JAGGED_SERIES_END = new Date('2026-07-11T12:00:00-07:00');
export const JAGGED_POINT_MIN = 30;
export const JAGGED_POINT_MAX = 40;

function jaggedPointCount(slug: string): number {
  return JAGGED_POINT_MIN + (hashSlug(slug) % (JAGGED_POINT_MAX - JAGGED_POINT_MIN + 1));
}

function hashSlug(slug: string): number {
  return [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function buildSyntheticProgressRows(input: SyntheticProgressInput): SyntheticProgressRow[] {
  const jitter = ((hashSlug(input.slug) % 7) - 3) / 100;
  const ratios = [0.56 + jitter, 0.7 + jitter / 2, 0.84 - jitter / 2, 1];
  const weights =
    input.progression && input.progression.length >= 4
      ? input.progression.slice(0, 4)
      : ratios.map((ratio, index) =>
          index === ratios.length - 1 ? input.currentWeightLb : roundToNearestHalf(input.currentWeightLb * ratio),
        );

  return gradeRows.map((row, index) => ({
    ...row,
    weightLb: weights[index],
    reps: index === gradeRows.length - 1 ? (input.currentReps ?? 1) : 1,
  }));
}

export function buildJaggedSyntheticLiftSeries(input: SyntheticProgressInput): SyntheticLiftChartPoint[] {
  const seed = hashSlug(input.slug);
  const random = createSeededRandom(seed);
  const pointCount = jaggedPointCount(input.slug);
  const endWeight = input.currentWeightLb;
  const startWeight = roundToNearestHalf(endWeight * (0.5 + (seed % 13) / 100));
  const floorWeight = roundToNearestHalf(startWeight * 0.88);
  const spanMs = JAGGED_SERIES_END.getTime() - JAGGED_SERIES_START.getTime();
  const points: SyntheticLiftChartPoint[] = [];

  let previousWeight = startWeight;

  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1);
    const date = new Date(JAGGED_SERIES_START.getTime() + spanMs * progress);
    const trend = startWeight + (endWeight - startWeight) * progress ** 0.82;
    const seasonal =
      Math.sin(index * 0.95 + seed * 0.11) * endWeight * 0.05 +
      Math.sin(index * 0.41 + seed * 0.07) * endWeight * 0.03;
    const dip = random() < 0.22 ? -endWeight * (0.03 + random() * 0.07) : 0;
    const spike = random() < 0.1 ? endWeight * (0.02 + random() * 0.04) : 0;
    const pullback = index > 0 && random() < 0.16 ? -(previousWeight - floorWeight) * (0.08 + random() * 0.2) : 0;

    let weightLb = roundToNearestHalf(trend + seasonal + dip + spike + pullback);
    weightLb = Math.max(floorWeight, Math.min(endWeight * 1.04, weightLb));

    if (index === pointCount - 1) {
      weightLb = endWeight;
    }

    const reps =
      index === pointCount - 1
        ? (input.currentReps ?? 8)
        : Math.max(3, Math.min(12, Math.round(6 + seasonal / 4 + (random() - 0.5) * 5)));

    points.push({
      date: date.toISOString(),
      label: formatChartMonth(date),
      weightLb,
      reps,
      oneRm: estimateOneRepMax(weightLb, reps),
    });

    previousWeight = weightLb;
  }

  return points;
}
