import { Camera, ClipboardList, Scale, Sparkles, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EncouragementLine } from '../components/EncouragementLine';
import { uiMock } from '../data/uiMock';
import { useUiStore } from '../stores/uiStore';

export function Today() {
  const preferredName = useUiStore((state) => state.preferredName);
  const focus = useUiStore((state) => state.focus);
  const remaining = uiMock.todayMacros.calorieTarget - uiMock.todayMacros.calories;
  const proteinShare = Math.round((uiMock.todayMacros.proteinG / 80) * 100);
  const greeting = preferredName ? `Hi ${preferredName} — you’re here` : 'You’re here — that matters';
  const mealLead =
    focus === 'weight'
      ? 'Weight comes first for you; meals still help when you feel like noting them.'
      : 'Tell us what’s on the plate — bhagara rice, sarakha kura, chai — in your own words. Small check-ins add up.';

  return (
    <div className="grid animate-rise gap-9">
      <section>
        <p className="text-sm text-fgMuted">{greeting}</p>
        <h1 className="page-title mt-2">Today is already going well</h1>
        <div className="mt-4">
          <EncouragementLine />
        </div>
        <p className="page-lead mt-4">
          Note your weight when you’re ready. {mealLead}
        </p>
      </section>

      <section className="rounded-2xl border border-accent/15 bg-accentSoft/70 px-5 py-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 text-fgMuted" size={18} strokeWidth={1.5} />
          <div>
            <h2 className="text-lg font-medium text-fg">{uiMock.motivation.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fgMuted">{uiMock.motivation.body}</p>
            <p className="mt-3 text-editorial text-fg">{uiMock.motivation.nudge}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="button-secondary min-h-11" to="/log?type=meal&capture=voice">
                Say it privately
              </Link>
              <Link className="text-link self-center" to="/log?type=meal">
                Or type the plate
              </Link>
            </div>
          </div>
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
              {uiMock.weightDelta} since yesterday · steady work
            </p>
          </div>
        </div>
        <button className="button-secondary" type="button">
          Update weigh-in
        </button>
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-fg">What’s on your plate</h2>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              {uiMock.todayMacros.calories} of {uiMock.todayMacros.calorieTarget} kcal so far — room
              for about {remaining} more. Protein is at {proteinShare}% of a gentle target. Good pace.
            </p>
          </div>
          <Link className="text-link" to="/log">
            Add more
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Protein', value: `${uiMock.todayMacros.proteinG} g` },
            { label: 'Carbs', value: `${uiMock.todayMacros.carbsG} g` },
            { label: 'Fat', value: `${uiMock.todayMacros.fatG} g` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border/70 bg-surface/80 px-3 py-4 text-center"
            >
              <p className="text-xs text-fgMuted">{item.label}</p>
              <p className="tabular mt-1 text-lg font-medium text-fg">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {uiMock.meals.map((meal) => (
            <article
              key={meal.id}
              className="rounded-2xl border border-border/70 bg-surface/80 px-4 py-3.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-fg">{meal.title}</p>
                <p className="tabular text-sm text-fgMuted">{meal.calories} kcal</p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-fgMuted">{meal.summary}</p>
              <p className="mt-2 text-xs text-fgMuted/80">{meal.time}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Link className="button-primary" to="/log?type=meal">
            <Utensils size={18} strokeWidth={1.5} />
            Log a meal
          </Link>
          <Link className="button-secondary" to="/log?type=meal&capture=voice">
            Say privately
          </Link>
          <Link className="button-secondary" to="/log?type=meal&capture=photo">
            <Camera size={18} strokeWidth={1.5} />
            Snap
          </Link>
        </div>
      </section>

      <hr className="section-rule" />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-fg">Little intentions</h2>
            <p className="mt-1 text-sm text-fgMuted">One done already — keep going gently.</p>
          </div>
          <Link className="text-link" to="/goals">
            See all
          </Link>
        </div>
        <div className="grid gap-2">
          {uiMock.goals.map((goal) => (
            <div
              key={goal.id}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 ${
                goal.done ? 'border-accent/15 bg-accentSoft' : 'border-border/70 bg-surface/70'
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                  goal.done ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'
                }`}
              >
                ✓
              </span>
              <p className={`text-sm ${goal.done ? 'text-fg' : 'text-fgMuted'}`}>
                {goal.done ? `${goal.name} — done` : goal.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border/80 bg-mist/40 px-5 py-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 text-fgMuted" size={18} strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-medium text-fg">If your body wants a lift later</p>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              You’re already taking care of today. The workout log will wait for you — proud either way.
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
