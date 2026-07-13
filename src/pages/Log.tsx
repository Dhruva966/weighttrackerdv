import { Camera, Dumbbell, Utensils } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function Log() {
  const [params] = useSearchParams();
  const type = params.get('type') === 'workout' ? 'workout' : 'meal';
  const capture = params.get('capture') === 'photo';

  return (
    <div className="grid animate-rise gap-7">
      <div>
        <h1 className="page-title">You’re doing something kind</h1>
        <p className="page-lead mt-3">
          Every note helps. Describe a thali, dabba, or cutting chai — or take a soft photo of the plate.
          No perfect wording needed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition ${
            type === 'meal'
              ? 'border-accent/25 bg-accentSoft text-fg'
              : 'border-border/80 bg-surface/80 text-fgMuted hover:bg-mist/70'
          }`}
          to="/log?type=meal"
        >
          <Utensils size={16} strokeWidth={1.5} />
          Meal
        </Link>
        <Link
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition ${
            type === 'workout'
              ? 'border-accent/25 bg-accentSoft text-fg'
              : 'border-border/80 bg-surface/80 text-fgMuted hover:bg-mist/70'
          }`}
          to="/log?type=workout"
        >
          <Dumbbell size={16} strokeWidth={1.5} />
          Workout
        </Link>
      </div>

      {type === 'meal' ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Link
              className={`button-secondary ${!capture ? 'border-fg/40' : ''}`}
              to="/log?type=meal"
            >
              Describe
            </Link>
            <Link
              className={`button-secondary ${capture ? 'border-fg/40' : ''}`}
              to="/log?type=meal&capture=photo"
            >
              <Camera size={16} />
              Photo
            </Link>
          </div>

          {capture ? (
            <div className="app-card grid place-items-center gap-3 py-16 text-center">
              <Camera size={28} className="text-fgMuted" strokeWidth={1.5} />
              <p className="font-medium text-fg">A soft photo of your plate</p>
              <p className="max-w-xs text-sm leading-relaxed text-fgMuted">
                Camera comes later. For now, continue to see how confirm looks.
              </p>
              <Link className="button-primary mt-2" to="/log/meal/confirm">
                Continue with a sample plate
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="label">What did you eat?</span>
                <textarea
                  className="field min-h-36 py-3"
                  defaultValue="1 plate lemon rice with peanut chutney and cucumber salad"
                  placeholder="e.g. 2 idli, sambar, coconut chutney"
                />
              </label>
              <p className="text-xs leading-relaxed text-fgMuted">
                Katori, roti count, dabba, plate — all welcome. Rough is fine; we’ll estimate together.
              </p>
              <Link className="button-primary" to="/log/meal/confirm">
                Look it over with me
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="app-card grid gap-4">
          <div>
            <h2 className="text-lg font-medium text-fg">A lift when you feel ready</h2>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              Optional — and still worthy. Pick exercises, then jot sets in plain English.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-mist/50 px-4 py-3 text-sm leading-relaxed text-fgMuted">
            Example: “preacher curl 115 for 8 7 7, last rep helped — felt strong”
          </div>
          <Link className="button-secondary" to="/session/new">
            Start when you’re ready
          </Link>
          <Link className="text-link" to="/exercises">
            Browse exercises
          </Link>
        </section>
      )}
    </div>
  );
}
