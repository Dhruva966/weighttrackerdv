import { Play } from 'lucide-react';
import { TemplateMenu } from './TemplateMenu';

type TemplateCardProps = {
  name: string;
  exerciseNames: string[];
  onStart: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export function TemplateCard({ name, exerciseNames, onStart, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const editable = onEdit && onDuplicate && onDelete;

  return (
    <div className="app-card grid min-w-0 gap-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-fg">{name}</p>
          <p className="truncate text-sm text-fgMuted">
            {exerciseNames.length ? exerciseNames.join(' · ') : 'No exercises yet'}
          </p>
        </div>
        {editable ? <TemplateMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} /> : null}
      </div>
      <button className="button-secondary min-h-11 justify-center gap-1.5" type="button" onClick={onStart}>
        <Play size={15} strokeWidth={1.75} />
        Start workout
      </button>
    </div>
  );
}
