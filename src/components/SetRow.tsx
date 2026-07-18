import { Trash2, Trophy } from 'lucide-react';
import { formatWeight } from '../lib/fmt';
import type { LoggedSet } from '../types';

export function SetRow({
  setItem,
  onDelete,
}: {
  setItem: LoggedSet;
  /** When set, shows a trash control for correcting a wrong log. */
  onDelete?: (setId: string) => void;
}) {
  return (
    <div
      className={
        onDelete
          ? 'grid grid-cols-[3rem_1fr_auto_auto] items-center gap-2 rounded-xl border border-border bg-bg px-3 py-3'
          : 'grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border border-border bg-bg px-3 py-3'
      }
    >
      <span className="tabular text-sm font-bold text-fgMuted">#{setItem.setNumber}</span>
      <span className="tabular font-bold text-fg">
        {formatWeight(setItem.weightLb)} x {setItem.reps}
      </span>
      {setItem.isPr ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-pr/15 px-2 py-1 text-xs font-medium text-pr">
          <Trophy size={14} />
          PR
        </span>
      ) : onDelete ? (
        <span />
      ) : null}
      {onDelete ? (
        <button
          className="icon-button h-11 w-11 shrink-0 text-fgMuted"
          type="button"
          aria-label={`Delete set ${setItem.setNumber}`}
          onClick={() => onDelete(setItem.id)}
        >
          <Trash2 size={18} />
        </button>
      ) : null}
    </div>
  );
}
