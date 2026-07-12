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

const gradeRows: Array<Pick<SyntheticProgressRow, 'grade' | 'date'>> = [
  { grade: '9th', date: '2022-09-01T12:00:00-07:00' },
  { grade: '10th', date: '2023-09-01T12:00:00-07:00' },
  { grade: '11th', date: '2024-09-01T12:00:00-07:00' },
  { grade: 'Current', date: '2026-07-11T12:00:00-07:00' },
];

function hashSlug(slug: string): number {
  return [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
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
    reps: index === gradeRows.length - 1 ? input.currentReps ?? 1 : 1,
  }));
}
