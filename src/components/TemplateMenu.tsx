import { MoreVertical } from 'lucide-react';
import { useState } from 'react';

export function TemplateMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative">
      <button
        className="icon-button"
        type="button"
        aria-label="Template actions"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical size={16} strokeWidth={1.5} />
      </button>
      {open ? (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 grid w-40 gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-soft">
            <button
              className="min-h-10 rounded-lg px-3 text-left text-sm text-fg hover:bg-mist"
              type="button"
              onClick={() => choose(onEdit)}
            >
              Edit
            </button>
            <button
              className="min-h-10 rounded-lg px-3 text-left text-sm text-fg hover:bg-mist"
              type="button"
              onClick={() => choose(onDuplicate)}
            >
              Duplicate
            </button>
            <button
              className="min-h-10 rounded-lg px-3 text-left text-sm text-danger hover:bg-mist"
              type="button"
              onClick={() => choose(onDelete)}
            >
              Delete
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
