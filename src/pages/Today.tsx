import { Camera, ClipboardList, Scale, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { uiMock } from '../data/uiMock';

export function Today() {
  const remaining = uiMock.todayMacros.calorieTarget - uiMock.todayMacros.calories;

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm text-fgMuted">Good afternoon</p>
        <h1 className="page-title mt-1">Keep it simple today</h1>
        <p className="page-lead mt-3 text-fgMuted">
          Weigh in once. Log meals in your own words — idli, dal, roti, chai. Lift when you want.
        </p>
      </section>

      <section className="app-card grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-fgMuted" />
            <h2 className="text-lg font-medium text-fg">Weight</h2>
          </div>
          <span className="text-sm text-fgMuted">Today</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <p className="tabular text-5xl font-medium leading-none text-fg">{uiMock.weightLb}</p>
          <div className="text-right">
            <p className="text-sm text-fgMuted">lb</p>
            <p className="mt-1 text-sm text-fg">{uiMock.weightDelta} lb vs yesterday</p>
          </div>
        </div>
        <button className="button-secondary" type="button">
          Update weigh-in
        </button>
      </section>

      <section className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-fg">Today’s food</h2>
            <p className="mt-1 text-sm text-fgMuted">
              {uiMock.todayMacros.calories} / {uiMock.todayMacros.calorieTarget} kcal · {remaining} left
            </p>
          </div>
          <Link className="text-link" to="/log">
            Log meal
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Protein', value: `${uiMock.todayMacros.proteinG} g` },
            { label: 'Carbs', value: `${uiMock.todayMacros.carbsG} g` },
            { label: 'Fat', value: `${uiMock.todayMacros.fatG} g` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
              <p className="text-xs text-fgMuted">{item.label}</p>
              <p className="tabular mt-1 text-lg font-medium text-fg">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {uiMock.meals.map((meal) => (
            <article key={meal.id} className="rounded-lg border border-border bg-bg px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-fg">{meal.title}</p>
                <p className="tabular text-sm text-fgMuted">{meal.calories} kcal</p>
              </div>
              <p className="mt-1 text-sm text-fgMuted">{meal.summary}</p>
              <p className="mt-2 text-xs text-fgMuted">{meal.time}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="button-primary" to="/log?type=meal">
            <Utensils size={18} />
            Log a meal
          </Link>
          <Link className="button-secondary" to="/log?type=meal&capture=photo">
            <Camera size={18} />
            Photo of plate
          </Link>
        </div>
      </section>

      <hr className="section-rule" />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-medium text-fg">Gentle goals</h2>
          <Link className="text-link" to="/goals">
            All goals
          </Link>
        </div>
        <div className="grid gap-2">
          {uiMock.goals.map((goal) => (
            <div
              key={goal.id}
              className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 ${
                goal.done ? 'border-fg/20 bg-accentSoft' : 'border-border bg-surface'
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                  goal.done ? 'border-fg bg-fg text-bg' : 'border-border text-transparent'
                }`}
              >
                ✓
              </span>
              <p className={`text-sm ${goal.done ? 'text-fg' : 'text-fgMuted'}`}>{goal.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border bg-surface/60 px-4 py-4">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 text-fgMuted" size={18} />
          <div className="flex-1">
            <p className="font-medium text-fg">Want to lift today?</p>
            <p className="mt-1 text-sm text-fgMuted">Optional. Your workout log lives here when you’re ready.</p>
            <Link className="button-secondary mt-3 inline-flex" to="/log?type=workout">
              Start workout
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
