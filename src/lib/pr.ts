export type SetPerformance = {
  weightLb: number;
  reps: number;
  isWarmup?: boolean;
};

export function isPersonalRecord(candidate: SetPerformance, history: SetPerformance[]): boolean {
  if (candidate.isWarmup) {
    return false;
  }

  return !history.some((set) => {
    if (set.isWarmup) {
      return false;
    }

    return set.weightLb > candidate.weightLb || (set.weightLb === candidate.weightLb && set.reps >= candidate.reps);
  });
}

export function estimateOneRepMax(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) {
    return 0;
  }

  return Math.round(weightLb * (1 + reps / 30) * 10) / 10;
}
