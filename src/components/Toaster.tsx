import { X } from 'lucide-react';
import { useEffect } from 'react';
import { usePrStore } from '../stores/prStore';
import { useUiStore } from '../stores/uiStore';

/** Ephemeral status toast; Session undo/redo lives in the page header. */
const PREVIEW_NOTICE_MS = 30_000;

export function Toaster() {
  const lastPr = usePrStore((state) => state.lastPr);
  const clearPr = usePrStore((state) => state.clearPr);
  const previewNotice = useUiStore((state) => state.previewNotice);
  const clearPreviewNotice = useUiStore((state) => state.clearPreviewNotice);

  useEffect(() => {
    if (!previewNotice) {
      return;
    }
    const timer = window.setTimeout(() => clearPreviewNotice(), PREVIEW_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [previewNotice, clearPreviewNotice]);

  if (!lastPr && !previewNotice) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-md gap-1.5">
      {previewNotice ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-border/80 bg-surface/95 px-2.5 py-1.5 shadow-soft"
          role="status"
        >
          <p className="min-w-0 flex-1 truncate text-xs leading-snug text-fg">{previewNotice}</p>
          <button
            className="icon-button h-7 w-7 shrink-0"
            type="button"
            onClick={clearPreviewNotice}
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
      {lastPr ? (
        <div className="rounded-xl border border-border bg-surface p-3 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-pr">New PR</p>
              <p className="mt-0.5 text-xs text-fg">
                {lastPr.exerciseName}: {lastPr.weightLb} lb x {lastPr.reps}
              </p>
            </div>
            <button
              className="icon-button h-8 w-8"
              type="button"
              onClick={clearPr}
              aria-label="Dismiss PR toast"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
