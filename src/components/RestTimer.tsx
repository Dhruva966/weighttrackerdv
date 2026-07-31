import { Pause, Play, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUiStore } from '../stores/uiStore';

type TimerStatus = 'idle' | 'running' | 'paused';

export function RestTimer({ activeKey }: { activeKey: string }) {
  const restSeconds = useUiStore((state) => state.restSeconds);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remaining, setRemaining] = useState(restSeconds);

  // New set or duration change: arm the timer at full duration, stay idle.
  useEffect(() => {
    setStatus('idle');
    setRemaining(restSeconds);
  }, [activeKey, restSeconds]);

  useEffect(() => {
    if (status !== 'running') return;

    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setStatus('idle');
          return restSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status, restSeconds]);

  const start = () => {
    if (status === 'idle') {
      setRemaining(restSeconds);
    }
    setStatus('running');
  };

  const pause = () => {
    setStatus('paused');
  };

  const reset = () => {
    setRemaining(restSeconds);
    setStatus('idle');
  };

  const urgent = status === 'running' && remaining <= 5 && remaining > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <TimerReset className={urgent ? 'text-danger' : 'text-accent'} size={22} aria-hidden />
        <div>
          <p className="text-sm font-semibold text-fgMuted">Rest timer</p>
          <p className="tabular text-xl font-medium text-fg" aria-live="polite">
            {remaining}s
            {status === 'paused' ? (
              <span className="ml-2 text-sm font-normal text-fgMuted">paused</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === 'running' ? (
          <button className="button-secondary min-h-9 px-3" type="button" onClick={pause}>
            <Pause size={16} aria-hidden />
            Pause
          </button>
        ) : (
          <button className="button-primary min-h-9 px-3" type="button" onClick={start}>
            <Play size={16} aria-hidden />
            {status === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button className="button-secondary min-h-9 px-3" type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
