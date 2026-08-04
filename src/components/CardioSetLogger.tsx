import { Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';

type EditRunner = (label: string, run: () => void | Promise<void>) => void | Promise<void>;

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Structured cardio logger: level, speed, time (minutes), calories. */
export function CardioSetLogger({
  sessionId,
  exercise,
  disabled = false,
  onEdit,
}: {
  sessionId: string;
  exercise: Exercise;
  disabled?: boolean;
  onEdit?: EditRunner;
}) {
  const addSet = useWorkoutStore((state) => state.addSet);
  const sets = useWorkoutStore((state) => state.sets);
  const previous = useMemo(
    () => [...sets].reverse().find((setItem) => setItem.exerciseId === exercise.id),
    [exercise.id, sets],
  );

  const [level, setLevel] = useState(previous?.level != null ? String(previous.level) : '');
  const [speed, setSpeed] = useState(previous?.speed != null ? String(previous.speed) : '');
  const [minutes, setMinutes] = useState(
    previous?.durationSec != null ? String(Math.round(previous.durationSec / 60)) : '',
  );
  const [calories, setCalories] = useState(
    previous?.calories != null ? String(previous.calories) : '',
  );
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function runEdit(label: string, run: () => void | Promise<void>) {
    if (onEdit) {
      await onEdit(label, run);
      return;
    }
    await run();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || isSaving) {
      return;
    }

    const nextLevel = optionalNumber(level);
    const nextSpeed = optionalNumber(speed);
    const nextMinutes = optionalNumber(minutes);
    const nextCalories = optionalNumber(calories);
    const durationSec =
      nextMinutes != null && nextMinutes > 0 ? Math.round(nextMinutes * 60) : undefined;

    if (
      nextLevel == null &&
      nextSpeed == null &&
      durationSec == null &&
      nextCalories == null
    ) {
      setMessage('Enter at least one of level, speed, time, or calories.');
      return;
    }

    setMessage('');
    setIsSaving(true);
    try {
      await runEdit('Logged cardio', () => {
        addSet({
          sessionId,
          exerciseId: exercise.id,
          weightLb: 0,
          reps: 0,
          isWarmup: false,
          level: nextLevel,
          speed: nextSpeed,
          durationSec,
          calories: nextCalories,
        });
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit}>
      <p className="text-xs text-fgMuted">Cardio — level, speed, time, calories</p>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">Level</span>
          <input
            className="field mt-1 min-h-9 tabular"
            inputMode="decimal"
            type="number"
            step="0.5"
            value={level}
            disabled={disabled}
            onChange={(event) => setLevel(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Speed</span>
          <input
            className="field mt-1 min-h-9 tabular"
            inputMode="decimal"
            type="number"
            step="0.1"
            value={speed}
            disabled={disabled}
            onChange={(event) => setSpeed(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Time (min)</span>
          <input
            className="field mt-1 min-h-9 tabular"
            inputMode="decimal"
            type="number"
            step="0.5"
            min="0"
            value={minutes}
            disabled={disabled}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Calories</span>
          <input
            className="field mt-1 min-h-9 tabular"
            inputMode="decimal"
            type="number"
            step="1"
            min="0"
            value={calories}
            disabled={disabled}
            onChange={(event) => setCalories(event.target.value)}
          />
        </label>
      </div>
      {message ? <p className="text-xs text-fgMuted">{message}</p> : null}
      <button
        className="button-primary min-h-10 justify-center text-sm"
        type="submit"
        disabled={disabled || isSaving}
      >
        <Save size={16} />
        {isSaving ? 'Logging…' : 'Log cardio'}
      </button>
    </form>
  );
}
