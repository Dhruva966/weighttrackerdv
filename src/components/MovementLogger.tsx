import { Footprints } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { parseMovementText } from '../lib/movement-from-text';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';

export function MovementLogger({
  compact = false,
  onLogged,
}: {
  compact?: boolean;
  onLogged?: (summary: string) => void;
}) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const addMovement = useDiaryStore((state) => state.addMovement);
  const tendGold = useUiStore((state) => state.tendGold);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseMovementText(text);
    if (!parsed) {
      setMessage('Try “walking 30 min”, “ran 20 minutes”, or “hiked 1 hour”.');
      return;
    }

    addMovement({
      kind: parsed.kind,
      title: parsed.title,
      durationMin: parsed.durationMin,
      summary: parsed.summary,
      raw: parsed.raw,
    });
    tendGold();
    const notice = parsed.durationMin
      ? `Logged ${parsed.title.toLowerCase()} · ${parsed.durationMin} min`
      : `Logged ${parsed.title.toLowerCase()}`;
    setMessage(notice);
    showPreviewNotice(notice);
    onLogged?.(notice);
    setText('');
  }

  return (
    <form
      className={compact ? 'grid gap-2' : 'app-card grid gap-3'}
      onSubmit={handleSubmit}
    >
      {!compact ? (
        <div className="flex items-center gap-2">
          <Footprints size={16} className="text-fgMuted" strokeWidth={1.5} />
          <p className="text-sm font-medium text-fg">Log a walk / movement</p>
        </div>
      ) : null}
      <label className="grid gap-1.5">
        <span className="sr-only">Movement in plain English</span>
        <input
          className="field !h-10 !min-h-0 text-sm"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (message) {
              setMessage(null);
            }
          }}
          placeholder="walking 30 min · ran 20 minutes · hiked 1 hour"
        />
      </label>
      <button className="button-primary justify-self-start" type="submit" disabled={!text.trim()}>
        Log movement
      </button>
      {message ? <p className="text-xs text-fgMuted">{message}</p> : null}
    </form>
  );
}
