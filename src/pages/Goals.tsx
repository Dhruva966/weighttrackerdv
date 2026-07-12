import { Check } from 'lucide-react';
import { useWorkoutStore } from '../stores/workoutStore';

export function Goals() {
  const goals = useWorkoutStore((state) => state.goals);
  const toggleGoal = useWorkoutStore((state) => state.toggleGoal);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-fg">Goals</h1>
        <p className="mt-1 text-sm text-fgMuted">Board goals converted into checkable targets.</p>
      </div>
      <div className="grid gap-2">
        {goals.map((goal) => (
          <button
            key={goal.id}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left hover:border-accent"
            type="button"
            onClick={() => toggleGoal(goal.id)}
          >
            <span className={`grid h-8 w-8 place-items-center rounded-lg border ${goal.achieved ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'}`}>
              <Check size={18} />
            </span>
            <span className={goal.achieved ? 'font-bold text-fgMuted line-through' : 'font-bold text-fg'}>{goal.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
