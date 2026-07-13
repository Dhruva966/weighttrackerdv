import { Camera, ClipboardList, Scale, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EncouragementLine } from '../components/EncouragementLine';
import { uiMock } from '../data/uiMock';
import { useUiStore } from '../stores/uiStore';

export function Today() {
  const preferredName = useUiStore((state) => state.preferredName);
  const focus = useUiStore((state) => state.focus);
  const intentions = useUiStore((state) => state.intentions);
  const toggleIntention = useUiStore((state) => state.toggleIntention);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const remaining = uiMock.todayMacros.calorieTarget - uiMock.todayMacros.calories;
  const doneCount = intentions.filter((goal) => goal.done).length;
  const greeting = preferredName ? `Hi ${preferredName} — glad you’re here` : 'Glad you’re here';
  const mealLead =
    focus === 'weight'
      ? 'Weight comes first for you; meals still help when you feel like noting them.'
      : 'Tell us what’s on the plate — bhagara rice, sarakha kura, chai — in your own words.';
  const primaryLog =
    focus === 'weight' ? (
      <button
        className="button-primary"
        type="button"
        onClick={() =>
          showPreviewNotice('Weigh-in editing stays preview-only for now — your logged number is already here.')
        }
      >
        Morning weigh-in logged
      </button>
    ) : (
      <Link className="button-primary" to="/log?type=meal">
        <Utensils size={18} strokeWidth={1.5} />
        Log a meal
      </Link>
    );

  return (
    <div className="grid animate-rise gap-9">
      <section>
        <p className="text-sm text-fgMuted">{greeting}</p>
        <h1 className="page-title mt-2">One soft check-in is enough</h1>
        <div className="mt-4">
          <EncouragementLine />
        </div>
        <p className="page-lead mt-4">
          Note your weight when you’re ready. {mealLead}
        </p>
        <div className="mt-5 grid gap-2">
          {primaryLog}
          <Link className="text-link" to="/log?type=meal&capture=voice">
            Or say the plate privately on this device
          </Link>
        </div>
      </section>

      <section className="app-card grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-fgMuted" strokeWidth={1.5} />
            <h2 className="text-lg font-medium text-fg">Morning weight</h2>
          </div>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs text-fg">Logged — nice</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <p className="tabular text-5xl font-medium leading-none tracking-tight text-fg">{uiMock.weightLb}</p>
          <div className="pb-1 text-right">
            <p className="text-sm text-fgMuted">pounds</p>
            <p className="mt-1 text-sm text-fg">
              {uiMock.weightDelta} since yesterday · nice and steady
            </p>
          </div>
        </div>
        <button
          className="button-secondary opacity-70"
          type="button"
          disabled
          title="Weigh-in editing comes in a later preview"
        >
          Update weigh-in
        </button>
        <p className="text-xs leading-relaxed text-fgMuted">
          Editing the number arrives in a later preview. For now this is your calm demo weigh-in.
        </p>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-medium text-fg">What’s on your plate</h2>
          <p className="mt-1 text-sm leading-relaxed text-fgMuted">
            {uiMock.todayMacros.calories} of {uiMock.todayMacros.calorieTarget} kcal · about {remaining} still
            soft for the evening · protein {uiMock.todayMacros.proteinG}g · carbs{' '}
            {uiMock.todayMacros.carbsG}g · fat {uiMock.todayMacros.fatG}g
          </p>
        </div>

        <div className="grid gap-0 divide-y divide-border/80 border-y border-border/80">
          {uiMock.meals.map((meal) => (
            <article key={meal.id} className="py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-fg">{meal.title}</p>
                <p className="tabular text-sm text-fgMuted">{meal.calories} kcal</p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-fgMuted">{meal.summary}</p>
              <p className="mt-1 text-xs text-fgMuted/80">{meal.time}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link className="text-link" to="/log?type=meal&capture=photo">
            <span className="inline-flex items-center gap-1.5">
              <Camera size={14} strokeWidth={1.5} /> Snap a plate later
            </span>
          </Link>
        </div>
      </section>

      <hr className="section-rule" />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-fg">Little intentions</h2>
            <p className="mt-1 text-sm text-fgMuted">
              {doneCount} of {intentions.length} gently done
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
            <p className="font-medium text-fg">If your body wants a lift later</p>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              You’re already taking care of today. The workout log will wait — proud either way.
            </p>
            <Link className="button-secondary mt-4 inline-flex" to="/log?type=workout">
              Open workout when ready
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
