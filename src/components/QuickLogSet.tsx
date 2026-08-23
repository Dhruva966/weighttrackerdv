import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import type { Exercise } from '../types';
import { useRestTimerStore } from '../stores/restTimerStore';

interface QuickLogSetProps {
  exercise: Exercise;
  sessionId: string;
  setNumber: number;
  lastWeight?: number;
  lastReps?: number;
  lastRpe?: number;
  onLogSet: (data: { weightLb: number; reps: number; rpe?: number }) => Promise<void>;
  onComplete?: () => void;
}

export function QuickLogSet({
  exercise,
  setNumber,
  lastWeight = 0,
  lastReps = 10,
  lastRpe,
  onLogSet,
  onComplete,
}: QuickLogSetProps) {
  const [weight, setWeight] = useState(lastWeight);
  const [reps, setReps] = useState(lastReps);
  const [rpe, setRpe] = useState(lastRpe ?? 7);
  const [isLogging, setIsLogging] = useState(false);
  
  const autoStart = useRestTimerStore((state) => state.autoStart);
  const startTimer = useRestTimerStore((state) => state.start);

  const handleQuickLog = async () => {
    if (weight <= 0 || reps <= 0) {
      alert('Please enter valid weight and reps');
      return;
    }

    setIsLogging(true);
    
    try {
      await onLogSet({
        weightLb: weight,
        reps,
        rpe,
      });
      
      // Auto-start rest timer if enabled
      if (autoStart) {
        startTimer();
      }
      
      onComplete?.();
    } catch (error) {
      console.error('Failed to log set:', error);
      alert('Failed to log set. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="quick-log-panel rounded-xl border border-border bg-surface p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-fg">{exercise.name}</h3>
        <p className="text-sm text-fgMuted">
          Set {setNumber}
          {lastWeight > 0 && lastReps > 0 && (
            <span className="ml-2">
              · Last: {lastWeight} lb × {lastReps} reps
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4">
        {/* Weight Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-fg">
            Weight (lb)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeight((w) => Math.max(0, w - 5))}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-center text-lg font-semibold tabular-nums text-fg"
              step="2.5"
              min="0"
              disabled={isLogging}
            />
            <button
              onClick={() => setWeight((w) => w + 5)}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Reps Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-fg">
            Reps
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps((r) => Math.max(0, r - 1))}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-center text-lg font-semibold tabular-nums text-fg"
              min="0"
              disabled={isLogging}
            />
            <button
              onClick={() => setReps((r) => r + 1)}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* RPE Input (Optional) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-fg">
            RPE (optional, 1-10)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRpe((r) => Math.max(1, r - 0.5))}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <input
              type="number"
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="h-10 flex-1 rounded-lg border border-border bg-bg px-3 text-center text-lg font-semibold tabular-nums text-fg"
              step="0.5"
              min="1"
              max="10"
              disabled={isLogging}
            />
            <button
              onClick={() => setRpe((r) => Math.min(10, r + 0.5))}
              className="icon-button h-10 w-10"
              disabled={isLogging}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleQuickLog}
        disabled={isLogging || weight <= 0 || reps <= 0}
        className="button-primary mt-6 w-full gap-2"
      >
        <Check size={18} strokeWidth={2} />
        {isLogging ? 'Logging...' : `Log Set ${setNumber}`}
        {autoStart && !isLogging && ' & Start Rest'}
      </button>

      {autoStart && (
        <p className="mt-2 text-center text-xs text-fgMuted">
          Rest timer will start automatically
        </p>
      )}
    </div>
  );
}
