import type { LoggedSet, WorkoutSession } from '../types';

function formatWeight(weightLb: number): string {
  return Number.isInteger(weightLb) ? String(weightLb) : String(weightLb);
}

/**
 * Faded Log-box hint from the most recent prior session for this exercise.
 * Format: `weight, reps, sets` (e.g. `44, 8, 3`) using the first non-warmup set's
 * weight/reps and the count of non-warmup sets in that prior session.
 */
export function previousWorkoutLogPlaceholder(
  sets: LoggedSet[],
  sessions: Array<Pick<WorkoutSession, 'id' | 'startedAt'>>,
  exerciseId: string,
  currentSessionId: string,
): string {
  const currentStartedAt = sessions.find((session) => session.id === currentSessionId)?.startedAt;

  const priorWorking = sets.filter(
    (setItem) =>
      setItem.exerciseId === exerciseId &&
      !setItem.isWarmup &&
      setItem.sessionId !== currentSessionId,
  );
  if (priorWorking.length === 0) {
    return '';
  }

  const startedAtById = new Map(sessions.map((session) => [session.id, session.startedAt]));
  const sessionIds = [...new Set(priorWorking.map((setItem) => setItem.sessionId))];

  const ranked = sessionIds
    .map((sessionId) => ({
      sessionId,
      startedAt: startedAtById.get(sessionId) ?? '',
    }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const previous =
    (currentStartedAt
      ? ranked.find((item) => item.startedAt && item.startedAt < currentStartedAt)
      : undefined) ?? ranked[0];

  if (!previous) {
    return '';
  }

  const sessionSets = priorWorking
    .filter((setItem) => setItem.sessionId === previous.sessionId)
    .sort(
      (a, b) =>
        a.setNumber - b.setNumber || a.createdAt.localeCompare(b.createdAt),
    );

  const first = sessionSets[0];
  if (!first || sessionSets.length === 0) {
    return '';
  }

  return `${formatWeight(first.weightLb)}, ${first.reps}, ${sessionSets.length}`;
}
