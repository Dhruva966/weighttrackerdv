import { Trash2, Trophy } from 'lucide-react';
import { formatWeight } from '../lib/fmt';
import { isCardioSet, type LoggedSet } from '../types';

function formatDuration(durationSec: number): string {
  if (durationSec >= 60 && durationSec % 60 === 0) {
    return `${durationSec / 60} min`;
  }
  if (durationSec >= 60) {
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes}m ${seconds}s`;
  }
  return `${durationSec}s`;
}

function formatSetSummary(setItem: LoggedSet): string {
  if (isCardioSet(setItem) && setItem.weightLb <= 0) {
    const parts: string[] = [];
    if (setItem.level != null) {
      parts.push(`L${setItem.level}`);
    }
    if (setItem.speed != null) {
      parts.push(`${setItem.speed} spd`);
    }
    if (setItem.durationSec != null) {
      parts.push(formatDuration(setItem.durationSec));
    }
    if (setItem.calories != null) {
      parts.push(`${setItem.calories} cal`);
    }
    return parts.join(' · ') || 'Cardio';
  }

  return `${formatWeight(setItem.weightLb)} x ${setItem.reps}`;
}

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
      <span className="tabular font-bold text-fg">{formatSetSummary(setItem)}</span>
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
