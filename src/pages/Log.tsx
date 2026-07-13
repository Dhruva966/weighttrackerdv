import { Camera, Dumbbell, Utensils } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function Log() {
  const [params] = useSearchParams();
  const type = params.get('type') === 'workout' ? 'workout' : 'meal';
  const capture = params.get('capture') === 'photo';

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="page-title">Log</h1>
        <p className="mt-2 text-sm text-fgMuted">
          Meals first. Describe thali, dabba, or chai in plain words — or snap the plate.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium ${
            type === 'meal' ? 'border-fg bg-fg text-bg' : 'border-border bg-bg text-fgMuted'
          }`}
          to="/log?type=meal"
        >
          <Utensils size={16} />
          Meal
        </Link>
        <Link
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium ${
            type === 'workout' ? 'border-fg bg-fg text-bg' : 'border-border bg-bg text-fgMuted'
          }`}
          to="/log?type=workout"
        >
          <Dumbbell size={16} />
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
              <Camera size={28} className="text-fgMuted" />
              <p className="font-medium text-fg">Photo of your plate</p>
              <p className="max-w-xs text-sm text-fgMuted">
                UI placeholder — camera wiring comes later. Tap continue to see the confirm screen.
              </p>
              <Link className="button-primary mt-2" to="/log/meal/confirm">
                Continue with sample plate
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
              <p className="text-xs text-fgMuted">
                Tip: katori, roti count, dabba, plate — all fine. We’ll estimate macros on confirm.
              </p>
              <Link className="button-primary" to="/log/meal/confirm">
                Review macros
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="app-card grid gap-4">
          <div>
            <h2 className="text-lg font-medium text-fg">Workout</h2>
            <p className="mt-1 text-sm text-fgMuted">
              Secondary for this redesign. Pick exercises, then log sets in plain English.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg px-4 py-3 text-sm text-fgMuted">
            Example: “preacher curl 115 for 8 7 7, last rep helped”
          </div>
          <Link className="button-secondary" to="/session/new">
            Open workout logger
          </Link>
          <Link className="text-link" to="/exercises">
            Browse exercises
          </Link>
        </section>
      )}
    </div>
  );
}
