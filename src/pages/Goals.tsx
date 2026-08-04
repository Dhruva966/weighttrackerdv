import { Check, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useUiStore } from '../stores/uiStore';

export function Goals() {
  const intentions = useUiStore((state) => state.intentions);
  const toggleIntention = useUiStore((state) => state.toggleIntention);
  const addIntention = useUiStore((state) => state.addIntention);
  const removeIntention = useUiStore((state) => state.removeIntention);
  const [draft, setDraft] = useState('');
  const doneCount = intentions.filter((goal) => goal.done).length;

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!addIntention(draft)) {
      return;
    }
    setDraft('');
  }

  return (
    <div className="grid animate-rise gap-6">
      <div>
        <h1 className="page-title">Intentions</h1>
        <p className="page-lead mt-3">
          Shape these however you want — add, check off, remove. {doneCount} of {intentions.length}{' '}
          done.
        </p>
      </div>

      <form className="flex items-center gap-2" onSubmit={handleAdd}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">New intention</span>
          <input
            className="field !h-10 !min-h-0 !rounded-xl px-3 text-sm"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add an intention…"
            maxLength={80}
          />
        </label>
        <button className="button-primary !min-h-10 gap-1.5 px-3 text-sm" type="submit" disabled={!draft.trim()}>
          <Plus size={16} strokeWidth={1.75} className="block" />
          Add
        </button>
      </form>

      <div className="grid gap-2">
        {intentions.length === 0 ? (
          <p className="text-sm text-fgMuted">No intentions yet — add one above.</p>
        ) : (
          intentions.map((goal) => (
            <div
              key={goal.id}
              className={`flex min-h-11 items-center gap-2 rounded-2xl border px-2 pl-3 transition ${
                goal.done
                  ? 'border-accent/15 bg-accentSoft'
                  : 'border-border/70 bg-surface/80'
              }`}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                type="button"
                aria-pressed={goal.done}
                aria-label={goal.name}
                onClick={() => toggleIntention(goal.id)}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] ${
                    goal.done ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'
                  }`}
                  aria-hidden
                >
                  <Check size={12} strokeWidth={2} />
                </span>
                <span className={`truncate text-sm ${goal.done ? 'text-fg' : 'text-fgMuted'}`}>
                  {goal.name}
                </span>
              </button>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fgMuted transition hover:bg-mist hover:text-fg"
                type="button"
                aria-label={`Remove ${goal.name}`}
                onClick={() => removeIntention(goal.id)}
              >
                <Trash2 size={15} strokeWidth={1.5} className="block" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
