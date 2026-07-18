import { isBoardBaselineSession } from '../data/catalog';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { calculateGoldDays, collectConsistencyDays, GOLD_TIME_ZONE, toGoldDayKey } from './gold';

/** Recompute `goldDays` from weigh-ins, walks/cardio, and gym days with sets. */
export function syncPotOfGold(now: Date = new Date()): number {
  const { bodyWeightLogs, movements } = useDiaryStore.getState();
  const { sessions, sets } = useWorkoutStore.getState();

  const sessionsWithSets = new Set(sets.map((setItem) => setItem.sessionId));
  const gymSessionStarts = sessions
    .filter((session) => !isBoardBaselineSession(session.id) && sessionsWithSets.has(session.id))
    .map((session) => session.startedAt);

  const consistencyDays = collectConsistencyDays({
    weighInDays: bodyWeightLogs.map((log) => log.loggedAt),
    movementAts: movements.map((movement) => movement.loggedAt),
    gymSessionStarts,
  });

  const today = toGoldDayKey(now.toISOString(), GOLD_TIME_ZONE);
  const goldDays = calculateGoldDays(consistencyDays, { today, timeZone: GOLD_TIME_ZONE });
  useUiStore.getState().setGoldDays(goldDays);
  return goldDays;
}
