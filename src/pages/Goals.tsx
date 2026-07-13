import { Check } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';

export function Goals() {
  const goals = useWorkoutStore((state) => state.goals);
  const toggleGoal = useWorkoutStore((state) => state.toggleGoal);

  return (
    <div className="grid animate-rise gap-6">
      <div>
        <h1 className="page-title">Little intentions</h1>
        <p className="page-lead mt-3">
          Small daily nudges — weigh-in, home cooking, walks, lifts. Each checkmark is a real win.
        </p>
      </div>
      <div className="grid gap-2">
        {goals.map((goal) => (
          <button
            key={goal.id}
            className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left transition ${
              goal.achieved
                ? 'border-accent/15 bg-accentSoft'
                : 'border-border/70 bg-surface/80 hover:border-fg/15 hover:bg-mist/60'
            }`}
            type="button"
            onClick={() => toggleGoal(goal.id)}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] ${
                goal.achieved ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'
              }`}
            >
              <Check size={14} strokeWidth={2} />
            </span>
            <span className={goal.achieved ? 'text-fg' : 'text-fgMuted'}>{goal.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
