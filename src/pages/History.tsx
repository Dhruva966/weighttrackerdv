import { Link } from 'react-router-dom';
import { isBoardBaselineSession } from '../data/catalog';
import { toDayKey } from '../lib/calendar';
import { mealsForDay, movementsForDay, useDiaryStore } from '../stores/diaryStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { InteractiveGymCalendar, MOVE_TIMEZONE } from '../components/InteractiveGymCalendar';
import type { MuscleGroup } from '../types';

const kindStyles = {
  weight: 'border-accent/15 bg-accentSoft text-fg',
  meal: 'border-border/70 bg-surface/90 text-fg',
  workout: 'border-border/60 bg-mist/50 text-fgMuted',
  walk: 'border-accent/10 bg-mist/60 text-fg',
} as const;

type HistoryItem = {
  id: string;
  kind: keyof typeof kindStyles;
  label: string;
  detail: string;
};

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  'full-body': 'Full body',
  cardio: 'Cardio',
};

function groupLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) {
    return 'Today';
  }
  const yesterday = new Date(`${todayKey}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (dayKey === yesterday.toISOString().slice(0, 10)) {
    return 'Yesterday';
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

export function History({
  compact = false,
  showCalendar = true,
  gymOnly = false,
}: {
  compact?: boolean;
  showCalendar?: boolean;
  /** When true, skip meal chips (Grow keeps Eat tucked). */
  gymOnly?: boolean;
}) {
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const bodyWeightLogs = useDiaryStore((state) => state.bodyWeightLogs);
  const meals = useDiaryStore((state) => state.meals);
  const movements = useDiaryStore((state) => state.movements);

  const timeZone = MOVE_TIMEZONE;
  const todayKey = toDayKey(new Date(), timeZone);

  const dayKeys = new Set<string>();
  for (const log of bodyWeightLogs) {
    dayKeys.add(toDayKey(log.loggedAt, timeZone));
  }
  if (!gymOnly) {
    for (const meal of meals) {
      dayKeys.add(toDayKey(meal.loggedAt, timeZone));
    }
  }
  for (const movement of movements) {
    dayKeys.add(toDayKey(movement.loggedAt, timeZone));
  }
  for (const session of sessions) {
    dayKeys.add(toDayKey(session.startedAt, timeZone));
  }

  const recentDays = [...dayKeys].sort((a, b) => b.localeCompare(a)).slice(0, 8);

  const grouped = recentDays
    .map((day) => {
      const items: HistoryItem[] = [];
      const weight = bodyWeightLogs.find((log) => toDayKey(log.loggedAt, timeZone) === day);
      if (weight) {
        items.push({
          id: weight.id,
          kind: 'weight',
          label: `${weight.weightLb} lb`,
          detail: 'Body weight',
        });
      }
      if (!gymOnly) {
        for (const meal of mealsForDay(meals, day)) {
          items.push({
            id: meal.id,
            kind: 'meal',
            label: meal.title,
            detail: meal.summary || meal.raw || `${meal.calories} kcal`,
          });
        }
      }
      for (const movement of movementsForDay(movements, day)) {
        items.push({
          id: movement.id,
          kind: 'walk',
          label: movement.title,
          detail: movement.summary || movement.raw,
        });
      }
      const daySessionIds = new Set(
        sessions
          .filter((session) => toDayKey(session.startedAt, timeZone) === day)
          .map((session) => session.id),
      );
      if (daySessionIds.size > 0) {
        const muscleGroups = [
          ...new Set(
            sets
              .filter((setItem) => daySessionIds.has(setItem.sessionId))
              .map((setItem) => exercises.find((exercise) => exercise.id === setItem.exerciseId)?.muscleGroup)
              .filter((muscleGroup): muscleGroup is MuscleGroup => Boolean(muscleGroup)),
          ),
        ].map((muscleGroup) => muscleGroupLabels[muscleGroup]);
        items.push({
          id: `${day}-workout`,
          kind: 'workout',
          label: 'Workout',
          detail: muscleGroups.length ? muscleGroups.join(' · ') : 'Open to keep logging',
        });
      }
      return { day, dateLabel: groupLabel(day, todayKey), items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <div className={compact ? 'grid gap-6' : 'grid animate-rise gap-7'}>
      {compact ? null : (
        <div>
          <h1 className="page-title">This week</h1>
          <p className="page-lead mt-3">
            Weight, meals, and movement from your real logs — no synthetic filler.
          </p>
        </div>
      )}

      {showCalendar ? <InteractiveGymCalendar /> : null}

      <section className="grid gap-5">
        {grouped.length === 0 ? (
          <p className="text-sm text-fgMuted">Nothing logged yet — start with the bar above.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="grid gap-2">
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-fgMuted">{group.dateLabel}</h2>
              {group.items.map((item) => (
                <article
                  key={`${group.day}-${item.kind}-${item.id}`}
                  className={`rounded-2xl border px-4 py-3.5 ${kindStyles[item.kind]}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium capitalize">{item.kind}</p>
                    <p className="text-sm">{item.label}</p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed opacity-80">{item.detail}</p>
                </article>
              ))}
            </div>
          ))
        )}
      </section>

      <p className="text-center text-sm leading-relaxed text-fgMuted">
        {showCalendar ? null : (
          <>
            Gym calendar lives on{' '}
            <Link className="text-link" to="/move">
              Move
            </Link>
            .{' '}
          </>
        )}
        Older lifting sessions live in{' '}
        <Link className="text-link" to="/history/sessions">
          workout recaps
        </Link>
        .
      </p>
    </div>
  );
}

/** @deprecated Prefer importing from InteractiveGymCalendar — re-export for older imports. */
export { InteractiveGymCalendar } from '../components/InteractiveGymCalendar';
