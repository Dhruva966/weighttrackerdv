import { Link } from 'react-router-dom';
import { buildMonthGrid, buildSessionDayMap, toDayKey } from '../lib/calendar';
import { mealsForDay, movementsForDay, useDiaryStore } from '../stores/diaryStore';
import { useWorkoutStore } from '../stores/workoutStore';

const kindStyles = {
  weight: 'border-accent/15 bg-accentSoft text-fg',
  meal: 'border-border/70 bg-surface/90 text-fg',
  workout: 'border-border/60 bg-mist/50 text-fgMuted',
  walk: 'border-accent/10 bg-mist/60 text-fg',
} as const;

type HistoryItem = {
  kind: keyof typeof kindStyles;
  label: string;
  detail: string;
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

export function History({ compact = false }: { compact?: boolean }) {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const bodyWeightLogs = useDiaryStore((state) => state.bodyWeightLogs);
  const meals = useDiaryStore((state) => state.meals);
  const movements = useDiaryStore((state) => state.movements);

  const timeZone = 'America/Los_Angeles';
  const todayKey = toDayKey(new Date(), timeZone);
  const now = new Date();
  const year = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(now),
  );
  const month = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit' }).format(now),
  );

  const activityByDay = buildSessionDayMap(
    sessions.map((session) => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    })),
    sets.map((setItem) => ({
      sessionId: setItem.sessionId,
      isPr: setItem.isPr,
      isWarmup: setItem.isWarmup,
    })),
    { timeZone, today: todayKey },
  );

  const cells = buildMonthGrid(year, month, activityByDay, { timeZone, today: todayKey });

  const dayKeys = new Set<string>();
  for (const log of bodyWeightLogs) {
    dayKeys.add(log.loggedAt);
  }
  for (const meal of meals) {
    dayKeys.add(meal.loggedAt.slice(0, 10));
  }
  for (const movement of movements) {
    dayKeys.add(movement.loggedAt.slice(0, 10));
  }
  for (const session of sessions) {
    dayKeys.add(toDayKey(session.startedAt, timeZone));
  }

  const recentDays = [...dayKeys].sort((a, b) => b.localeCompare(a)).slice(0, 8);

  const grouped = recentDays.map((day) => {
    const items: HistoryItem[] = [];
    const weight = bodyWeightLogs.find((log) => log.loggedAt === day);
    if (weight) {
      items.push({ kind: 'weight', label: `${weight.weightLb} lb`, detail: 'Body weight' });
    }
    for (const meal of mealsForDay(meals, day)) {
      items.push({
        kind: 'meal',
        label: meal.title,
        detail: meal.summary || meal.raw || `${meal.calories} kcal`,
      });
    }
    for (const movement of movementsForDay(movements, day)) {
      items.push({
        kind: 'walk',
        label: movement.title,
        detail: movement.summary || movement.raw,
      });
    }
    const daySessions = sessions.filter(
      (session) => toDayKey(session.startedAt, timeZone) === day,
    );
    for (const session of daySessions) {
      const sessionSets = sets.filter((setItem) => setItem.sessionId === session.id);
      const names = [
        ...new Set(
          sessionSets.map(
            (setItem) =>
              exercises.find((exercise) => exercise.id === setItem.exerciseId)?.name ?? 'Exercise',
          ),
        ),
      ].slice(0, 3);
      items.push({
        kind: 'workout',
        label: session.endedAt ? 'Workout' : 'Open session',
        detail: names.length ? names.join(' · ') : `${sessionSets.length} sets`,
      });
    }
    return { dateLabel: groupLabel(day, todayKey), items };
  }).filter((group) => group.items.length > 0);

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

      <section className="app-card">
        <p className="text-sm text-fgMuted">This month</p>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-fgMuted">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((cell, index) => (
            <div
              key={cell.date ?? `empty-${index}`}
              className={`relative grid aspect-square place-items-center rounded-xl text-sm ${
                !cell.day
                  ? 'text-transparent'
                  : cell.activity?.hadGymVisit
                    ? 'bg-accentSoft font-medium text-fg'
                    : cell.isToday
                      ? 'border border-accent/40 text-fg'
                      : 'text-fgMuted'
              }`}
            >
              {cell.day ?? '·'}
              {cell.activity?.hadProgressiveOverload ? (
                <span className="absolute right-1 top-0.5 text-[10px] font-medium text-accent/80">+</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-fgMuted">
          <span>Soft fill = gym day</span>
          <span>
            <span className="font-medium text-accent">+</span> = PR day
          </span>
        </div>
      </section>

      <section className="grid gap-5">
        {grouped.length === 0 ? (
          <p className="text-sm text-fgMuted">Nothing logged yet — start with the bar above.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.dateLabel} className="grid gap-2">
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-fgMuted">
                {group.dateLabel}
              </h2>
              {group.items.map((item) => (
                <article
                  key={`${group.dateLabel}-${item.kind}-${item.label}-${item.detail}`}
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
        Older lifting sessions live in{' '}
        <Link className="text-link" to="/history/sessions">
          workout recaps
        </Link>
        .
      </p>
    </div>
  );
}
