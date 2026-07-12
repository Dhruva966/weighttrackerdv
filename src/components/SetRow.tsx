import { Trophy } from 'lucide-react';
import { formatWeight } from '../lib/fmt';
import type { LoggedSet } from '../types';

export function SetRow({ setItem }: { setItem: LoggedSet }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border border-border bg-bg px-3 py-3">
      <span className="tabular text-sm font-bold text-fgMuted">#{setItem.setNumber}</span>
      <span className="tabular font-bold text-fg">
        {formatWeight(setItem.weightLb)} x {setItem.reps}
      </span>
      {setItem.isPr ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-pr/15 px-2 py-1 text-xs font-extrabold text-pr">
          <Trophy size={14} />
          PR
        </span>
      ) : null}
    </div>
  );
}
