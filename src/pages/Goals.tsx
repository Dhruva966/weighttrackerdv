import { Check } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

export function Goals() {
  const intentions = useUiStore((state) => state.intentions);
  const toggleIntention = useUiStore((state) => state.toggleIntention);
  const doneCount = intentions.filter((goal) => goal.done).length;

  return (
    <div className="grid animate-rise gap-6">
      <div>
        <h1 className="page-title">Intentions</h1>
        <p className="page-lead mt-3">
          Daily checks that compound — weigh-in, train, better than yesterday. {doneCount} of{' '}
          {intentions.length} done.
        </p>
      </div>
      <div className="grid gap-2">
        {intentions.map((goal) => (
          <button
            key={goal.id}
            className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left transition ${
              goal.done
                ? 'border-accent/15 bg-accentSoft'
                : 'border-border/70 bg-surface/80 hover:border-fg/15 hover:bg-mist/60'
            }`}
            type="button"
            onClick={() => toggleIntention(goal.id)}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] ${
                goal.done ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'
              }`}
            >
              <Check size={14} strokeWidth={2} />
            </span>
            <span className={goal.done ? 'text-fg' : 'text-fgMuted'}>{goal.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
