import { X } from 'lucide-react';
import { useEffect } from 'react';
import { usePrStore } from '../stores/prStore';
import { useUiStore } from '../stores/uiStore';

export function Toaster() {
  const lastPr = usePrStore((state) => state.lastPr);
  const clearPr = usePrStore((state) => state.clearPr);
  const previewNotice = useUiStore((state) => state.previewNotice);
  const clearPreviewNotice = useUiStore((state) => state.clearPreviewNotice);

  useEffect(() => {
    if (!previewNotice) {
      return;
    }
    const timer = window.setTimeout(() => clearPreviewNotice(), 4200);
    return () => window.clearTimeout(timer);
  }, [previewNotice, clearPreviewNotice]);

  if (!lastPr && !previewNotice) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-md gap-2">
      {previewNotice ? (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-fg">{previewNotice}</p>
            <button
              className="icon-button h-9 w-9 shrink-0"
              type="button"
              onClick={clearPreviewNotice}
              aria-label="Dismiss notice"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}
      {lastPr ? (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-pr">New PR</p>
              <p className="mt-1 text-sm text-fg">
                {lastPr.exerciseName}: {lastPr.weightLb} lb x {lastPr.reps}
              </p>
            </div>
            <button
              className="icon-button h-9 w-9"
              type="button"
              onClick={clearPr}
              aria-label="Dismiss PR toast"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
