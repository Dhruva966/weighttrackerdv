import { Play } from 'lucide-react';
import { TemplateMenu } from './TemplateMenu';

type TemplateCardProps = {
  name: string;
  exerciseNames: string[];
  onStart: () => void;
  /** Defaults to "Start workout"; Session uses "Add to workout". */
  actionLabel?: string;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export function TemplateCard({
  name,
  exerciseNames,
  onStart,
  actionLabel = 'Start workout',
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const editable = onEdit && onDuplicate && onDelete;

  return (
    <div className="app-card grid min-w-0 gap-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{name}</p>
          <p className="truncate text-xs text-fgMuted">
            {exerciseNames.length ? exerciseNames.join(' · ') : 'No exercises yet'}
          </p>
        </div>
        {editable ? <TemplateMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} /> : null}
      </div>
      <button className="button-secondary min-h-9 justify-center gap-1.5" type="button" onClick={onStart}>
        <Play size={15} strokeWidth={1.75} />
        {actionLabel}
      </button>
    </div>
  );
}
