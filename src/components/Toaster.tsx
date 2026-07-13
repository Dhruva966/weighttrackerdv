import { X } from 'lucide-react';
import { usePrStore } from '../stores/prStore';

export function Toaster() {
  const lastPr = usePrStore((state) => state.lastPr);
  const clearPr = usePrStore((state) => state.clearPr);

  if (!lastPr) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-lg border border-border bg-bg p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-pr">New PR</p>
          <p className="mt-1 text-sm text-fg">
            {lastPr.exerciseName}: {lastPr.weightLb} lb x {lastPr.reps}
          </p>
        </div>
        <button className="icon-button h-9 w-9" type="button" onClick={clearPr} aria-label="Dismiss PR toast">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
