import { TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUiStore } from '../stores/uiStore';

export function RestTimer({ activeKey }: { activeKey: string }) {
  const restSeconds = useUiStore((state) => state.restSeconds);
  const [endsAt, setEndsAt] = useState(Date.now() + restSeconds * 1000);
  const [remaining, setRemaining] = useState(restSeconds);

  useEffect(() => {
    setEndsAt(Date.now() + restSeconds * 1000);
  }, [activeKey, restSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <TimerReset className={remaining <= 5 ? 'text-danger' : 'text-accent'} size={22} />
        <div>
          <p className="text-sm font-semibold text-fgMuted">Rest timer</p>
          <p className="tabular text-xl font-medium text-fg">{remaining}s</p>
        </div>
      </div>
      <button className="button-secondary min-h-11 px-3" type="button" onClick={() => setEndsAt(Date.now() + restSeconds * 1000)}>
        Reset
      </button>
    </div>
  );
}
