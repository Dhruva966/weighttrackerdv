import { AlertCircle, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { DayType } from '../lib/exercise-scheduler';
import { getPriorityExercises } from '../lib/exercise-scheduler';
import { useSchedulerStore } from '../stores/schedulerStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function ExerciseRecommendations({ dayType }: { dayType?: DayType }) {
  const exercises = useWorkoutStore((state) => state.exercises);
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const frequencies = useSchedulerStore((state) => state.frequencies);
  const config = useSchedulerStore((state) => state.config);
  const currentDayType = useSchedulerStore((state) => state.currentDayType);
  const setCurrentDayType = useSchedulerStore((state) => state.setCurrentDayType);

  const effectiveDayType = dayType ?? currentDayType;

  const { overdue, carryover, suggested } = useMemo(
    () => getPriorityExercises(exercises, sessions, sets, frequencies, effectiveDayType, config),
    [exercises, sessions, sets, frequencies, effectiveDayType, config],
  );

  const hasAnyRecommendations = overdue.length > 0 || carryover.length > 0 || suggested.length > 0;

  if (!hasAnyRecommendations) {
    return null;
  }

  const dayTypeLabels: Record<DayType, string> = {
    push: 'Push Day',
    pull: 'Pull Day',
    legs: 'Legs Day',
    arms: 'Arms Day',
    'chest-back': 'Chest & Back Day',
    'full-body': 'Full Body',
    any: 'Any Exercises',
  };

  return (
    <div className="grid gap-4">
      {/* Day Type Selector */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-fg">Recommended for today</h2>
        <select
          value={effectiveDayType}
          onChange={(e) => setCurrentDayType(e.target.value as DayType)}
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-fg"
        >
          <option value="any">Any exercises</option>
          <option value="push">Push Day</option>
          <option value="pull">Pull Day</option>
          <option value="legs">Legs Day</option>
          <option value="arms">Arms Day</option>
          <option value="chest-back">Chest & Back</option>
          <option value="full-body">Full Body</option>
        </select>
      </div>

      {/* Overdue Exercises */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-orange-900">
            <AlertCircle size={18} strokeWidth={2} />
            <h3 className="text-sm font-medium">
              Overdue ({overdue.length}) — Haven't done in a while
            </h3>
          </div>
          <div className="grid gap-2">
            {overdue.slice(0, 3).map((rec) => (
              <Link
                key={rec.exercise.id}
                to={`/exercises/${rec.exercise.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 transition hover:bg-orange-100"
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium text-fg">{rec.exercise.name}</p>
                  <p className="text-xs text-fgMuted">{rec.reason}</p>
                </div>
                <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fgMuted" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Carryover Exercises */}
      {carryover.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-blue-900">
            <Calendar size={18} strokeWidth={2} />
            <h3 className="text-sm font-medium">
              Carryover ({carryover.length}) — Planned last time but not completed
            </h3>
          </div>
          <div className="grid gap-2">
            {carryover.slice(0, 3).map((ex) => (
              <Link
                key={ex.id}
                to={`/exercises/${ex.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 transition hover:bg-blue-100"
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium text-fg">{ex.name}</p>
                  <p className="text-xs text-fgMuted">{ex.muscleGroup}</p>
                </div>
                <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fgMuted" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Exercises */}
      {suggested.length > 0 && (
        <div className="rounded-xl border border-border bg-surfaceAlt p-4">
          <div className="mb-3 flex items-center gap-2 text-fg">
            <TrendingUp size={18} strokeWidth={2} />
            <h3 className="text-sm font-medium">
              Suggested for {dayTypeLabels[effectiveDayType].toLowerCase()}
            </h3>
          </div>
          <div className="grid gap-2">
            {suggested.slice(0, 5).map((rec) => (
              <Link
                key={rec.exercise.id}
                to={`/exercises/${rec.exercise.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-bg p-3 transition hover:bg-surface"
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium text-fg">{rec.exercise.name}</p>
                  <p className="text-xs text-fgMuted">
                    {rec.recency.daysSinceLastDone !== null
                      ? `Last done ${rec.recency.daysSinceLastDone} days ago`
                      : 'Never logged'}
                  </p>
                </div>
                <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fgMuted" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for showing staleness on exercise cards.
 */
export function ExerciseStalenessIndicator({
  exerciseId,
  size = 'sm',
}: {
  exerciseId: string;
  size?: 'sm' | 'lg';
}) {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const frequencies = useSchedulerStore((state) => state.frequencies);
  const config = useSchedulerStore((state) => state.config);

  const daysSince = useMemo(() => {
    const exSets = sets.filter((s) => s.exerciseId === exerciseId);
    if (exSets.length === 0) return null;

    const sessionIds = new Set(exSets.map((s) => s.sessionId));
    const relevantSessions = sessions
      .filter((s) => sessionIds.has(s.id) && s.endedAt)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    if (relevantSessions.length === 0) return null;

    const lastDate = new Date(relevantSessions[0].startedAt);
    const diffMs = Date.now() - lastDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [exerciseId, sessions, sets]);

  const freq = frequencies.find((f) => f.exerciseId === exerciseId);
  const targetInterval = freq?.targetDaysInterval ?? config.defaultInterval;

  if (daysSince === null) {
    return size === 'lg' ? (
      <div className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">Never logged</div>
    ) : null;
  }

  const daysOverdue = daysSince - targetInterval;

  if (daysOverdue <= 0) {
    return null; // Fresh, no indicator
  }

  if (daysOverdue >= 14) {
    return (
      <div
        className={`rounded-md bg-orange-100 px-2 py-1 ${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium text-orange-700`}
      >
        {daysOverdue}d overdue
      </div>
    );
  }

  if (daysOverdue >= 7) {
    return (
      <div
        className={`rounded-md bg-yellow-100 px-2 py-1 ${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium text-yellow-700`}
      >
        {daysOverdue}d overdue
      </div>
    );
  }

  return (
    <div
      className={`rounded-md bg-blue-100 px-2 py-1 ${size === 'lg' ? 'text-sm' : 'text-xs'} text-blue-700`}
    >
      Due soon
    </div>
  );
}
