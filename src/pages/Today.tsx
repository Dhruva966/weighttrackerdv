import { Camera, ClipboardList, Scale, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EncouragementLine } from '../components/EncouragementLine';
import { PotOfGold } from '../components/PotOfGold';
import {
  getBodyWeightDelta,
  getLatestBodyWeight,
  mealsForDay,
  sumMacros,
  useDiaryStore,
} from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(iso));
}

export function Today() {
  const preferredName = useUiStore((state) => state.preferredName);
  const intentions = useUiStore((state) => state.intentions);
  const toggleIntention = useUiStore((state) => state.toggleIntention);
  const goldDays = useUiStore((state) => state.goldDays);

  const bodyWeightLogs = useDiaryStore((state) => state.bodyWeightLogs);
  const meals = useDiaryStore((state) => state.meals);
  const calorieTarget = useDiaryStore((state) => state.calorieTarget);
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);

  const latestWeight = getLatestBodyWeight(bodyWeightLogs);
  const weightDelta = getBodyWeightDelta(bodyWeightLogs);
  const todayMeals = mealsForDay(meals);
  const macros = sumMacros(todayMeals);
  const remaining = calorieTarget - macros.calories;
  const doneCount = intentions.filter((goal) => goal.done).length;
  const openSessions = sessions.filter((session) => !session.endedAt).length;
  const setCount = sets.length;
  const greeting = preferredName ? `Hi ${preferredName}` : 'Welcome back';

  return (
    <div className="grid animate-rise gap-9">
      <section className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm text-fgMuted">{greeting}</p>
          <h1 className="page-title mt-2">Your pot of gold is filling</h1>
          <div className="mt-4">
            <EncouragementLine />
          </div>
          <p className="page-lead mt-4">
            Log weight, food, walks, and lifts in one bar. Better than yesterday — stay in motion.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="button-primary" to="/eat">
              <Utensils size={18} strokeWidth={1.5} />
              Open Eat
            </Link>
            <Link className="button-secondary" to="/move">
              Open Move
            </Link>
          </div>
        </div>
        <PotOfGold days={goldDays} className="justify-self-center" />
      </section>

      <section className="app-card grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-fgMuted" strokeWidth={1.5} />
            <h2 className="text-lg font-medium text-fg">Body weight</h2>
          </div>
          {latestWeight ? (
            <span className="rounded-full bg-accentSoft px-3 py-1 text-xs text-fg">Logged</span>
          ) : null}
        </div>
        {latestWeight ? (
          <div className="flex items-end justify-between gap-4">
            <p className="tabular text-5xl font-medium leading-none tracking-tight text-fg">
              {latestWeight.weightLb}
            </p>
            <div className="pb-1 text-right">
              <p className="text-sm text-fgMuted">pounds</p>
              <p className="mt-1 text-sm text-fg">
                {weightDelta === null
                  ? 'Say “weighed 169” to update'
                  : `${weightDelta > 0 ? '+' : ''}${weightDelta} vs last log`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fgMuted">No weigh-ins yet. Say “weighed 169” in the bar above.</p>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-medium text-fg">Today’s diary</h2>
          <p className="mt-1 text-sm leading-relaxed text-fgMuted">
            {macros.calories} of {calorieTarget} kcal · {remaining} left · protein {macros.proteinG}g
          </p>
        </div>

        {todayMeals.length === 0 ? (
          <p className="border-y border-border/80 py-6 text-sm leading-relaxed text-fgMuted">
            No meals logged yet. Type or speak something like “ate a sandwich, 600 calories, 40g protein.”
          </p>
        ) : (
          <div className="grid gap-0 divide-y divide-border/80 border-y border-border/80">
            {todayMeals.map((meal) => (
              <article key={meal.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-fg">{meal.title}</p>
                  <p className="tabular text-sm text-fgMuted">{meal.calories || '—'} kcal</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-fgMuted">{meal.summary || meal.raw}</p>
                <p className="mt-1 text-xs text-fgMuted/80">{formatTime(meal.loggedAt)}</p>
              </article>
            ))}
          </div>
        )}

        <Link className="text-link inline-flex items-center gap-1.5" to="/eat">
          <Camera size={14} strokeWidth={1.5} /> Log a meal
        </Link>
      </section>

      <hr className="section-rule" />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-fg">Intentions</h2>
            <p className="mt-1 text-sm text-fgMuted">
              {doneCount} of {intentions.length} done
            </p>
          </div>
          <Link className="text-link" to="/goals">
            See all
          </Link>
        </div>
        <div className="grid gap-2">
          {intentions.slice(0, 3).map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleIntention(goal.id)}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left transition ${
                goal.done ? 'border-accent/15 bg-accentSoft' : 'border-border/70 bg-surface/70'
              }`}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] ${
                  goal.done ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'
                }`}
                aria-hidden
              >
                ✓
              </span>
              <p className={`text-sm ${goal.done ? 'text-fg' : 'text-fgMuted'}`}>
                {goal.done ? `${goal.name} — done` : goal.name}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border/80 bg-mist/40 px-5 py-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 text-fgMuted" size={18} strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-medium text-fg">Training log</p>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              {setCount === 0
                ? 'No lifts logged yet — open Move or speak a set into the bar.'
                : `${setCount} sets recorded · ${openSessions} open session${openSessions === 1 ? '' : 's'}.`}
            </p>
            <Link className="button-secondary mt-4 inline-flex" to="/move">
              Open Move
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
