import { Camera, ClipboardList, Scale, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EncouragementLine } from '../components/EncouragementLine';
import { GardenLeaf } from '../components/GardenLeaf';
import { uiMock } from '../data/uiMock';
import { useUiStore } from '../stores/uiStore';

export function Today() {
  const preferredName = useUiStore((state) => state.preferredName);
  const focus = useUiStore((state) => state.focus);
  const intentions = useUiStore((state) => state.intentions);
  const toggleIntention = useUiStore((state) => state.toggleIntention);
  const gardenDays = useUiStore((state) => state.gardenDays);
  const remaining = uiMock.todayMacros.calorieTarget - uiMock.todayMacros.calories;
  const doneCount = intentions.filter((goal) => goal.done).length;
  const greeting = preferredName ? `Hi ${preferredName} — glad you’re here` : 'Glad you’re here';
  const mealLead =
    focus === 'weight'
      ? 'Weight comes first for you; meals still help when you feel like noting them.'
      : 'Tell the bar above what’s on the plate — bhagara rice, sarakha kura, chai — or a walk.';

  return (
    <div className="grid animate-rise gap-9">
      <section className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm text-fgMuted">{greeting}</p>
          <h1 className="page-title mt-2">Your garden is growing</h1>
          <div className="mt-4">
            <EncouragementLine />
          </div>
          <p className="page-lead mt-4">{mealLead}</p>
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
        <GardenLeaf days={gardenDays} className="justify-self-center" />
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
        <p className="text-xs leading-relaxed text-fgMuted">
          Say “weighed 142” in the bar above, or edit later when weigh-ins go live.
        </p>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-medium text-fg">Today’s diary</h2>
          <p className="mt-1 text-sm leading-relaxed text-fgMuted">
            {uiMock.todayMacros.calories} of {uiMock.todayMacros.calorieTarget} kcal · about {remaining} soft
            room left · protein {uiMock.todayMacros.proteinG}g
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

        <Link className="text-link inline-flex items-center gap-1.5" to="/eat?capture=photo">
          <Camera size={14} strokeWidth={1.5} /> Snap a plate later
        </Link>
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
            <p className="font-medium text-fg">Movement counts too</p>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              Walks, lifts, anything that tends the garden. Say it in the bar or open Move.
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
