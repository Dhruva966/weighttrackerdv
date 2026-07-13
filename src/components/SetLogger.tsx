import { Minus, Plus, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';

export function SetLogger({ sessionId, exercise }: { sessionId: string; exercise: Exercise }) {
  const addSet = useWorkoutStore((state) => state.addSet);
  const sets = useWorkoutStore((state) => state.sets);
  const previous = useMemo(() => [...sets].reverse().find((setItem) => setItem.exerciseId === exercise.id), [exercise.id, sets]);
  const [weightLb, setWeightLb] = useState(previous?.weightLb ?? 50);
  const [reps, setReps] = useState(previous?.reps ?? 10);

  return (
    <form
      className="grid gap-3 rounded-lg border border-border bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        addSet({ sessionId, exerciseId: exercise.id, weightLb, reps, isWarmup: false });
      }}
    >
      <div>
        <p className="font-bold text-fg">{exercise.name}</p>
        <p className="text-sm capitalize text-fgMuted">{exercise.muscleGroup}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <label>
          <span className="label">Weight</span>
          <input
            className="field tabular mt-1"
            min="0"
            inputMode="decimal"
            type="number"
            value={weightLb}
            onChange={(event) => setWeightLb(Number(event.target.value))}
          />
        </label>
        <div className="w-2" />
        <label>
          <span className="label">Reps</span>
          <div className="mt-1 grid grid-cols-[3rem_1fr_3rem]">
            <button className="rounded-l-xl border border-border bg-bg text-fg" type="button" onClick={() => setReps(Math.max(1, reps - 1))} aria-label="Decrease reps">
              <Minus className="mx-auto" size={18} />
            </button>
            <input
              className="min-h-14 border-y border-border bg-bg text-center font-bold text-fg outline-none"
              min="1"
              inputMode="numeric"
              type="number"
              value={reps}
              onChange={(event) => setReps(Math.max(1, Number(event.target.value)))}
            />
            <button className="rounded-r-xl border border-border bg-bg text-fg" type="button" onClick={() => setReps(reps + 1)} aria-label="Increase reps">
              <Plus className="mx-auto" size={18} />
            </button>
          </div>
        </label>
      </div>
      <button className="button-primary" type="submit">
        <Save size={20} />
        Save Set
      </button>
    </form>
  );
}
