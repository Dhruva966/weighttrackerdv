import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useRestTimerStore } from '../stores/restTimerStore';

export function RestTimer({ activeKey }: { activeKey?: string }) {
  const isActive = useRestTimerStore((state) => state.isActive);
  const start = useRestTimerStore((state) => state.start);
  const stop = useRestTimerStore((state) => state.stop);
  const reset = useRestTimerStore((state) => state.reset);
  const getTimeRemaining = useRestTimerStore((state) => state.getTimeRemaining);
  
  const [timeRemaining, setTimeRemaining] = useState(0);

  // When activeKey changes (new set logged), reset timer to idle
  useEffect(() => {
    if (activeKey) {
      reset();
    }
  }, [activeKey, reset]);

  // Update timer every 100ms when active
  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      // Stop when complete
      if (remaining === 0) {
        stop();
        // Vibrate if supported
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, getTimeRemaining, stop]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isActive && timeRemaining > 0
    ? (timeRemaining / useRestTimerStore.getState().duration) * 100
    : 100;

  return (
    <div className="rest-timer-widget">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-fgMuted">Rest Timer</p>
          <p className="text-2xl font-bold tabular-nums text-fg">
            {isActive ? formatTime(timeRemaining) : '—'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={() => start()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent/90"
              aria-label="Start rest timer"
            >
              <Play size={20} strokeWidth={2} fill="currentColor" />
            </button>
          ) : (
            <>
              <button
                onClick={stop}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600"
                aria-label="Stop rest timer"
              >
                <Pause size={20} strokeWidth={2} />
              </button>
              <button
                onClick={reset}
                className="icon-button"
                aria-label="Reset rest timer"
              >
                <RotateCcw size={18} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {isActive && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Completion message */}
      {!isActive && timeRemaining === 0 && useRestTimerStore.getState().startTime !== null && (
        <p className="mt-2 text-sm font-medium text-accent">
          ✓ Rest complete - Ready for next set!
        </p>
      )}
    </div>
  );
}

/**
 * Compact rest timer for use in session header or floating panel
 */
export function CompactRestTimer() {
  const isActive = useRestTimerStore((state) => state.isActive);
  const start = useRestTimerStore((state) => state.start);
  const stop = useRestTimerStore((state) => state.stop);
  const getTimeRemaining = useRestTimerStore((state) => state.getTimeRemaining);
  
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        stop();
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, getTimeRemaining, stop]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <button
        onClick={() => start()}
        className="rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/20"
      >
        Start Rest
      </button>
    );
  }

  return (
    <button
      onClick={stop}
      className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold tabular-nums text-white transition hover:bg-accent/90"
    >
      ⏱️ {formatTime(timeRemaining)}
    </button>
  );
}
