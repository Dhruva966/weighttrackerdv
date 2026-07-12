export type VolumeSet = {
  createdAt: string;
  weightLb: number;
  reps: number;
  muscleGroup: string;
};

export type WeeklyVolumeSummary = {
  totalVolume: number;
  byMuscle: Record<string, number>;
  percentByMuscle: Record<string, number>;
};

export function summarizeWeeklyVolume(
  sets: VolumeSet[],
  options: { weekStartsOn: string },
): WeeklyVolumeSummary {
  const startsAt = new Date(`${options.weekStartsOn}T00:00:00Z`);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);

  const byMuscle: Record<string, number> = {};

  for (const set of sets) {
    const createdAt = new Date(set.createdAt);
    if (createdAt < startsAt || createdAt >= endsAt) {
      continue;
    }

    byMuscle[set.muscleGroup] = (byMuscle[set.muscleGroup] ?? 0) + set.weightLb * set.reps;
  }

  const totalVolume = Object.values(byMuscle).reduce((sum, value) => sum + value, 0);
  const percentByMuscle = Object.fromEntries(
    Object.entries(byMuscle).map(([muscle, volume]) => [muscle, totalVolume === 0 ? 0 : Math.round((volume / totalVolume) * 100)]),
  );

  return { totalVolume, byMuscle, percentByMuscle };
}
